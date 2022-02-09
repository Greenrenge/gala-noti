var axios = require("axios")
var qs = require("qs")

module.exports = {
  send: (txt) => {
    console.log(`[SENDING NOTI] ${txt}`)
    if (!process.env.LINE_NOTIFY_TOKEN) {
      return
    }
    var config = {
      method: "post",
      url: "https://notify-api.line.me/api/notify",
      headers: {
        Authorization: `Bearer ${process.env.LINE_NOTIFY_TOKEN}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: qs.stringify({
        message: txt,
      }),
    }
    return axios(config)
      .then(function (response) {
        console.log(JSON.stringify(response.data))
      })
      .catch(function (error) {
        console.log(error)
      })
  },
}
