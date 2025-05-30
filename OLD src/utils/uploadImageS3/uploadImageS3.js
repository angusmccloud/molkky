import { Auth, Storage } from 'aws-amplify';
import * as ImagePicker from 'expo-image-picker';
import uuid from 'react-native-uuid';

// TO-DO: Might want to add more Mime Types in here
// This should cover all basic scenarios
// The usage below defaults to JPEG if lookup fails)
const mimeTypes = [
  {extension: 'jpg', mime: 'image/jpeg'},
  {extension: 'jpeg', mime: 'image/jpeg'},
  {extension: 'png', mime: 'image/png'},
  {extension: 'gif', mime: 'image/gif'},
]

export const takePhoto = async (setPercentage, uploadImageCallback) => {
  let result = await ImagePicker.launchCameraAsync({
    mediaTypes: "Images",
    quality: 1,
  });

  handleImagePicked(result, setPercentage, uploadImageCallback);
};

export const pickImage = async (setPercentage, uploadImageCallback) => {
  let result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: "Images",
    quality: 1,
  });
  handleImagePicked(result, setPercentage, uploadImageCallback);
};

const uploadImage = (filename, img, extension, setPercentage) => {
  Auth.currentCredentials();
  const mimeType = mimeTypes.find(mime => mime.extension === extension).mime || 'image/jpeg';
  return Storage.put(filename, img, {
    level: "public",
    contentType: mimeType,
    progressCallback(progress) {
      setLoading(progress, setPercentage);
    },
  })
    .then((response) => {
      return response.key;
    })
    .catch((error) => {
      console.log(error);
      return error.response;
    });
};

const setLoading = (progress, setPercentage) => {
  const calculated = parseInt((progress.loaded / progress.total) * 100);
  setPercentage(calculated);
};

const handleImagePicked = async (pickerResult, setPercentage, uploadImageCallback) => {
  try {
    if (pickerResult.cancelled) {
      console.log('Upload Cancelled');
      return;
    } else {
      setPercentage(0);
      const { width, height } = pickerResult;
      const img = await fetchImageFromUri(pickerResult.uri);
      const imgName = img._data.name;
      const parseImgName = imgName.split('.');
      const extension = parseImgName[parseImgName.length - 1];
      const newImageName = uuid.v4() + '.' + extension;
      const uploadUrl = await uploadImage(newImageName, img, extension, setPercentage);
      // console.log('-- uploadUrl --', uploadUrl);
      return uploadImageCallback({url: uploadUrl, width, height});
    }
  } catch (e) {
    console.log(e);
    alert("Upload failed");
  }
};

const fetchImageFromUri = async (uri) => {
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob;
};