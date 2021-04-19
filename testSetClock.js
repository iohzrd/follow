const DateTimeControl = require("set-system-clock");
// const DateTimeControl = require("set-system-clock-wfix");
const axios = require("axios");
const dtc = new DateTimeControl.DateTimeControl();
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
console.log(tz);
const url = `http://worldtimeapi.org/api/timezone/America/New_York`;
// const url = `http://worldtimeapi.org/api/timezone/${tz}`;
console.log(url);

axios.get(url).then((response) => {
  console.log(response.data.datetime);
  console.log(new Date());
  console.log(new Date(response.data.datetime));
  console.log(Math.floor(new Date(response.data.datetime).getTime()));
  console.log(Math.floor(new Date().getTime()));
  const ret = dtc.setDateTime(new Date(response.data.datetime));
  console.log(ret);
});
