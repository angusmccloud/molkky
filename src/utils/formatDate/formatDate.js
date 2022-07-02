const daysOfWeek = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const formatDate = (date) => {
  if(date) {
    const snapshotDate = new Date(date);
    const datePart = dateComponent(snapshotDate);
    const timePart = timeComponent(snapshotDate);
    return `${datePart} at ${timePart}`;  
  }
  return 'Moments Ago';
};

export default formatDate;

const dateComponent = (date) => {
  const today = new Date();
  // If the date is today, return "Today"
  if (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  ) {
    return "Today";
  }
  // If the date is yesterday, return "Yesterday"
  if (
    date.getDate() === today.getDate() - 1 &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  ) {
    return "Yesterday";
  }
  // If the date is within the last 7 days, return the day of the week
  if (
    date.getDate() >= today.getDate() - 7 &&
    date.getDate() <= today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  ) {
    return daysOfWeek[date.getDay()];
  }
  // If the date is within the last 180 day, return the month and day
  if (
    date.getDate() >= today.getDate() - 180 &&
    date.getDate() <= today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  ) {
    return `${months[date.getMonth()]} ${date.getDate()}`;
  }
  // Otherwise, return the month, day, and year
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

const timeComponent = (date) => {
  // Given a date, format it as "hh:mm a"
  let hours = date.getHours();
  let minutes = date.getMinutes();
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? "0" + minutes : minutes;
  return `${hours}:${minutes}${ampm}`;
};
