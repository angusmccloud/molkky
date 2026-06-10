import React, {
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export type DraggableListRenderItemInfo<T> = {
  item: T;
  index: number;
  /** Pass this gesture to a <GestureDetector> wrapping the drag handle. */
  drag: ReturnType<typeof Gesture.Pan> | ReturnType<typeof Gesture.Race>;
  isActive: boolean;
};

export type DraggableListProps<T> = {
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  onReorder: (newData: T[]) => void;
  renderItem: (info: DraggableListRenderItemInfo<T>) => ReactNode;
  /** Optional duration (ms) for long-press activation. Default 150ms. */
  longPressDuration?: number;
  /** Optional style for the outer container. */
  style?: any;
};

/**
 * Drag-to-reorder vertical list. Rows live in normal flex column flow;
 * resting layout shifts animate via per-row `withTiming` on translateY:
 * when a row's resting Y changes, it is pre-positioned at its OLD spot
 * via translateY and animated back to 0. The active row is dragged via
 * translateY (slide animation skipped for it so it stays under the
 * finger). Reorders fire mid-drag — non-active rows slide via the
 * per-row timing animation.
 *
 * Row-height: B2 "per-row measured" — each row's height is tracked in a
 * shared-value map keyed by item id, updated from each row's onLayout.
 * Drag thresholds and translateY-after-commit math use cumulative
 * offsets computed from real per-row heights, so rows of any height
 * (including 2+ line wrapping names) reorder accurately.
 *
 * Data structures:
 *   heightsRef: Ref<Record<string, number>>   // id -> measured px
 *   idsRef:     Ref<string[]>                  // current data order
 *   translateYsRef: Map<id, SharedValue<number>>  // per-row active offset
 *
 * Drag math runs on the JS thread (gesture worklets only `runOnJS` into the
 * handlers), so heights/ids live in plain refs rather than shared values.
 * The cumulative offset of any index is recomputed per-update from these
 * source-of-truth refs; the list is small (≤10 rows in practice), so this is
 * cheap and keeps state coherent across mid-drag commits. Only the per-row
 * translateY — read inside a `useAnimatedStyle` worklet — is a shared value.
 */

const FALLBACK_ROW_HEIGHT = 56;
// Minimum extra px the finger must travel past the next row's midpoint
// before a mid-drag commit fires. Expressed as a fraction of the target
// row's height. Pairs with the 80ms throttle below.
const HYSTERESIS_FRACTION = 0.2;
const COMMIT_THROTTLE_MS = 80;

function DraggableListInner<T>({
  data,
  keyExtractor,
  onReorder,
  renderItem,
  longPressDuration = 150,
  style,
}: DraggableListProps<T>) {
  // Per-id measured heights (px). Updated from each row's onLayout via
  // a stable JS callback. Read only on the JS thread (effects, drag
  // callbacks, and the resting-offset useMemo) — never inside a worklet —
  // so a plain ref is correct here. (A shared value would trip Reanimated's
  // strict-mode "reading `.value` during render" warning from the useMemo.)
  const heightsRef = useRef<Record<string, number>>({});

  // Current data order as a list of ids. Updated in a useEffect on every
  // `data` change. Read only on the JS thread by the drag callbacks, so a
  // plain ref suffices.
  const idsRef = useRef<string[]>([]);

  // Active item id. State (not ref) so the active row can opt out of the
  // layout transition on re-render. Only flips on drag-start / drag-end.
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  // Refs for stable-handler access to latest props/state.
  const dataRef = useRef(data); dataRef.current = data;
  const activeIdRef = useRef(activeItemId); activeIdRef.current = activeItemId;
  const keyExtractorRef = useRef(keyExtractor); keyExtractorRef.current = keyExtractor;
  const onReorderRef = useRef(onReorder); onReorderRef.current = onReorder;

  // Per-row translateY SVs, keyed by id. Each row registers on mount.
  const translateYsRef = useRef<Map<string, SharedValue<number>>>(new Map());

  // Active row's last-committed layout index (baseline for hysteresis).
  const committedIndexRef = useRef<number>(-1);
  // Throttle: ms-timestamp of last commit.
  const lastCommitAtRef = useRef<number>(0);
  // Cumulative translateY correction across mid-drag commits, in px.
  // Each commit shifts the active row's resting position; this offset
  // keeps the finger tracking the same screen position by adding to the
  // gesture's raw translationY in every update.
  const dragCorrectionRef = useRef<number>(0);

  // Keep idsRef in sync with `data` order, and prune heightsRef entries
  // for ids that are no longer in `data`.
  useEffect(() => {
    const ids = data.map((item, i) => keyExtractor(item, i));
    idsRef.current = ids;

    // Prune removed entries.
    const present = new Set(ids);
    const current = heightsRef.current;
    let changed = false;
    const next: Record<string, number> = {};
    for (const key of Object.keys(current)) {
      if (present.has(key)) next[key] = current[key];
      else changed = true;
    }
    if (changed) heightsRef.current = next;
  }, [data, keyExtractor]);

  // Stable height-update callback. Each row calls this on onLayout.
  // No-ops if the height is unchanged within 0.5px (sub-pixel jitter).
  const updateHeight = useCallback(
    (id: string, height: number) => {
      if (height <= 0) return;
      const current = heightsRef.current[id];
      if (current !== undefined && Math.abs(current - height) < 0.5) return;
      heightsRef.current = { ...heightsRef.current, [id]: height };
    },
    []
  );

  // --- Stable JS handlers (invoked from the gesture worklet via runOnJS).

  const handleDragStart = useCallback((id: string) => {
    const idx = dataRef.current.findIndex(
      (it, i) => keyExtractorRef.current(it, i) === id
    );
    if (idx === -1) return;
    committedIndexRef.current = idx;
    lastCommitAtRef.current = 0;
    dragCorrectionRef.current = 0;
    // Update the ref synchronously so drag-update events that fire
    // before the React re-render still pass the activeId guard.
    activeIdRef.current = id;
    setActiveItemId(id);
  }, []);

  // Compute cumulative top-offset of every index in the current data
  // order, plus the per-index height. Returns [offsets, heights, count].
  // Used by both the projection math and the post-commit translateY
  // correction.
  const computeLayout = useCallback(
    (ids: string[]): { offsets: number[]; heights: number[] } => {
      const heights = heightsRef.current;
      const out = { offsets: new Array<number>(ids.length), heights: new Array<number>(ids.length) };
      let acc = 0;
      for (let i = 0; i < ids.length; i++) {
        const h = heights[ids[i]] ?? FALLBACK_ROW_HEIGHT;
        out.offsets[i] = acc;
        out.heights[i] = h;
        acc += h;
      }
      return out;
    },
    []
  );

  const handleDragUpdate = useCallback(
    (id: string, translationY: number) => {
      if (activeIdRef.current !== id) return;

      const committed = committedIndexRef.current;
      if (committed < 0) return;

      // Snapshot of current order (ids) — captures the array AS IT IS
      // right now, including any prior mid-drag commits.
      const ids = idsRef.current;
      const count = ids.length;
      if (count === 0 || committed >= count) return;

      const { offsets, heights } = computeLayout(ids);

      // effectiveTranslation = raw gesture translation + cumulative
      // correction from prior mid-drag commits. This is the value the
      // row's translateY shared value should hold so its screen
      // position keeps tracking the finger across layout jumps.
      const correction = dragCorrectionRef.current;
      const effectiveTranslation = translationY + correction;

      const tY = translateYsRef.current.get(id);
      if (tY) tY.value = effectiveTranslation;

      // Swap detection uses the ACTIVE row's MIDPOINT vs each OTHER
      // row's midpoint. Crossing the other row's midpoint means we've
      // visually overtaken it, so it should slide out of our way.
      const restingY = offsets[committed];
      const activeHeight = heights[committed];
      const activeMidY = restingY + effectiveTranslation + activeHeight / 2;

      let projected = committed;
      // Dragging down — walk forward from committed, accept each row
      // whose midpoint we've crossed (plus hysteresis buffer).
      for (let i = committed + 1; i < count; i++) {
        const otherMid = offsets[i] + heights[i] / 2;
        const buffer = heights[i] * HYSTERESIS_FRACTION;
        if (activeMidY > otherMid + buffer) {
          projected = i;
        } else {
          break;
        }
      }
      // Dragging up — only check if we didn't already find a downward
      // target. Walk backward from committed.
      if (projected === committed) {
        for (let i = committed - 1; i >= 0; i--) {
          const otherMid = offsets[i] + heights[i] / 2;
          const buffer = heights[i] * HYSTERESIS_FRACTION;
          if (activeMidY < otherMid - buffer) {
            projected = i;
          } else {
            break;
          }
        }
      }

      if (projected === committed) return;

      // Throttle: COMMIT_THROTTLE_MS between commits.
      const now = Date.now();
      if (now - lastCommitAtRef.current < COMMIT_THROTTLE_MS) return;

      // Build the next array order. idsRef is the authoritative order;
      // we follow it and look up items by id from dataRef (which may
      // briefly lag between commits and the parent's re-render).
      const dataById = new Map<string, T>();
      const cur = dataRef.current;
      for (let i = 0; i < cur.length; i++) {
        dataById.set(keyExtractorRef.current(cur[i], i), cur[i]);
      }

      const nextIds = ids.slice();
      const [movedId] = nextIds.splice(committed, 1);
      nextIds.splice(projected, 0, movedId);

      const next: T[] = [];
      for (let i = 0; i < nextIds.length; i++) {
        const it = dataById.get(nextIds[i]);
        if (it === undefined) return; // bail if data hasn't caught up
        next.push(it);
      }

      // translateY correction: keep the active row's screen position
      // invariant across the layout jump.
      //   oldScreenY = oldRestingY + oldEffectiveTranslation
      //   newScreenY = newRestingY + newEffectiveTranslation
      //   → newEffectiveTranslation = oldEffectiveTranslation - delta
      //   → newCorrection           = correction - delta
      //   (so that translationY + newCorrection == newEffectiveTranslation)
      //
      // We update dragCorrection (read by the next finger update) here, but
      // deliberately do NOT touch tY.value yet. The flex relayout from the
      // setPlayers below lands a frame later, so writing the corrected tY now
      // would apply it against the OLD slot for one frame — the dragged row
      // flashes back toward its origin and snaps back. Instead the active
      // row's layout effect applies the −delta in the SAME commit as the
      // relayout (see DraggableRow), keeping it pinned under the finger.
      const { offsets: newOffsets } = computeLayout(nextIds);
      const newRestingY = newOffsets[projected];
      const delta = newRestingY - restingY;

      dragCorrectionRef.current = correction - delta;

      committedIndexRef.current = projected;
      lastCommitAtRef.current = now;
      idsRef.current = nextIds;

      onReorderRef.current(next);
    },
    [computeLayout]
  );

  const handleDragFinalize = useCallback((id: string) => {
    const tY = translateYsRef.current.get(id);
    if (tY) {
      tY.value = withTiming(0, { duration: 140 });
    }
    dragCorrectionRef.current = 0;
    activeIdRef.current = null;
    setActiveItemId(null);
  }, []);

  // Stable indirection: cached gesture worklets call these forever; the
  // ref points at the latest handler closures.
  const handlersRef = useRef({
    start: handleDragStart,
    update: handleDragUpdate,
    finalize: handleDragFinalize,
  });
  handlersRef.current = { start: handleDragStart, update: handleDragUpdate, finalize: handleDragFinalize };

  const dispatchStart = useCallback((id: string) => handlersRef.current.start(id), []);
  const dispatchUpdate = useCallback((id: string, ty: number) => handlersRef.current.update(id, ty), []);
  const dispatchFinalize = useCallback((id: string) => handlersRef.current.finalize(id), []);

  // Gesture cache keyed by id. Preserved across reorders so the gesture
  // stays attached to its row component (matched by React `key={id}`).
  const gesturesRef = useRef<Map<string, ReturnType<typeof Gesture.Simultaneous>>>(new Map());

  const gesturesByKey = useMemo(() => {
    const cache = gesturesRef.current;
    const seen = new Set<string>();

    for (let i = 0; i < data.length; i++) {
      const id = keyExtractor(data[i], i);
      seen.add(id);
      if (cache.has(id)) continue;

      const longPress = Gesture.LongPress()
        .minDuration(longPressDuration)
        .maxDistance(10000)
        .onStart(() => {
          'worklet';
          runOnJS(dispatchStart)(id);
        });

      const pan = Gesture.Pan()
        .activateAfterLongPress(longPressDuration)
        .onStart(() => {
          'worklet';
          runOnJS(dispatchStart)(id);
        })
        .onUpdate((event) => {
          'worklet';
          runOnJS(dispatchUpdate)(id, event.translationY);
        })
        .onFinalize(() => {
          'worklet';
          runOnJS(dispatchFinalize)(id);
        });

      cache.set(id, Gesture.Simultaneous(longPress, pan));
    }

    // Prune gestures for ids no longer in data.
    for (const id of Array.from(cache.keys())) {
      if (!seen.has(id)) cache.delete(id);
    }

    return data.map((item, i) => {
      const id = keyExtractor(item, i);
      return { id, gesture: cache.get(id)! };
    });
  }, [
    data,
    keyExtractor,
    longPressDuration,
    dispatchStart,
    dispatchUpdate,
    dispatchFinalize,
  ]);

  // Compute each row's resting Y offset for the current order. Rows use
  // this to detect index/position changes and slide smoothly between
  // old and new positions on reorder (see DraggableRow).
  const restingYs = useMemo(() => {
    const ids = data.map((item, i) => keyExtractor(item, i));
    const heights = heightsRef.current;
    const out = new Array<number>(ids.length);
    let acc = 0;
    for (let i = 0; i < ids.length; i++) {
      out[i] = acc;
      acc += heights[ids[i]] ?? FALLBACK_ROW_HEIGHT;
    }
    return out;
    // heightsRef isn't reactive, but row layout changes call updateHeight
    // which mutates it; the meaningful trigger for re-deriving resting
    // offsets is `data` reordering.
  }, [data, keyExtractor]);

  return (
    <View style={style}>
      {data.map((item, index) => {
        const { id, gesture } = gesturesByKey[index];
        const isActive = id === activeItemId;
        return (
          <DraggableRow
            key={id}
            id={id}
            item={item}
            index={index}
            isActive={isActive}
            restingY={restingYs[index]}
            gesture={gesture}
            renderItem={renderItem}
            translateYsRef={translateYsRef}
            onHeight={updateHeight}
          />
        );
      })}
    </View>
  );
}

type DraggableRowProps<T> = {
  id: string;
  item: T;
  index: number;
  isActive: boolean;
  restingY: number;
  gesture: ReturnType<typeof Gesture.Simultaneous>;
  renderItem: (info: DraggableListRenderItemInfo<T>) => ReactNode;
  translateYsRef: React.MutableRefObject<Map<string, SharedValue<number>>>;
  onHeight: (id: string, height: number) => void;
};

function DraggableRow<T>({
  id,
  item,
  index,
  isActive,
  restingY,
  gesture,
  renderItem,
  translateYsRef,
  onHeight,
}: DraggableRowProps<T>) {
  const translateY = useSharedValue(0);

  // Register this row's translateY so parent handlers can drive it.
  useEffect(() => {
    translateYsRef.current.set(id, translateY);
    return () => { translateYsRef.current.delete(id); };
  }, [id, translateY, translateYsRef]);

  // Per-row height measurement. Fires on every layout pass; the parent
  // dedupes sub-pixel jitter so the heights shared value only sees real
  // changes (mounts, font scale, wrapping changes).
  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      onHeight(id, e.nativeEvent.layout.height);
    },
    [id, onHeight]
  );

  // Reorder handling: when this row's resting (flex) position changes because
  // a mid-drag commit reordered the data, reconcile its translateY in the
  // SAME commit as the relayout.
  const prevRestingYRef = useRef(restingY);
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;
  // useLayoutEffect (not useEffect) is load-bearing: the reorder re-renders
  // rows into their NEW flex slots. A passive effect runs *after* paint, so
  // both branches below would land a frame late — long enough to see a flash
  // (a background row at its new slot before it slides; the dragged row
  // snapping off the finger and back). Running before paint applies the
  // offset in the same commit as the layout change, so neither flashes.
  useLayoutEffect(() => {
    const prev = prevRestingYRef.current;
    prevRestingYRef.current = restingY;
    if (prev === restingY) return;
    const delta = restingY - prev;
    if (isActiveRef.current) {
      // Dragged row: its flex slot just shifted by `delta`. Counter it
      // instantly (no animation) so the row stays pinned under the finger
      // instead of flashing toward its origin and back. The gesture handler
      // already shifted dragCorrection by the same delta, so the next finger
      // update stays consistent with this offset.
      translateY.value = translateY.value - delta;
      return;
    }
    // Background row: pre-position at its OLD slot, then animate to the new
    // one. withTiming cancels any in-flight reorder animation, so grabbing a
    // new drag mid-slide doesn't strand the row.
    translateY.value = -delta; // == prev - restingY
    translateY.value = withTiming(0, REORDER_TIMING);
  }, [restingY, translateY]);

  // scale lives in the worklet too so the single `transform` array
  // isn't fought over by RN's style merging (last writer wins).
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: isActive ? 1.04 : 1 },
    ],
  }), [isActive]);

  return (
    <Animated.View
      onLayout={handleLayout}
      style={[styles.row, isActive && styles.rowActive, animatedStyle]}
    >
      {renderItem({ item, index, drag: gesture as any, isActive })}
    </Animated.View>
  );
}

const REORDER_TIMING = {
  duration: 250,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
};

const styles = StyleSheet.create({
  // Rows participate in normal flex column flow — no absolute
  // positioning, no hardcoded height. Each row sizes to its content.
  row: { backgroundColor: 'transparent' },
  // Visual feedback while dragging. Scale is in the animated transform.
  rowActive: {
    zIndex: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    shadowOpacity: 0.25,
  },
});

// Re-export `GestureDetector` so callers don't need a second import.
export { GestureDetector };

const DraggableList = DraggableListInner as <T>(
  props: DraggableListProps<T>
) => React.ReactElement;

export default DraggableList;
