const { execute } = require("./cmd")
const { send } = require("./fireNoti")
const get = require("lodash/get")

var CronJob = require("cron").CronJob

async function main() {
  const checker = async function () {
    try {
      const { code, data } = await execute("gala-node stats")

      if (code != 0) {
        return [false, "process exit with non-zero return"]
      }
      try {
        const parsed = JSON.parse(data)
        if (+get(parsed, "summary.nodesOnline", 0) !== 1) {
          return [false, "NODE IS OFFLINE !!!!!!!"]
        }
        if (
          get(parsed, "summary.currentVersion") !==
          get(parsed, "summary.latestVersion")
        ) {
          return [false, "NODE NEEDS TO UPDATE VERSION !!"]
        }
        return [true]
      } catch (err) {
        return [false, "cannot parse the stdout"]
      }
    } catch (err) {
      return [false, "process stopped or failed to run"]
    }
  }
  const task = async () => {
    const [isSuccess, errorMsg] = await checker()
    console.log(
      "CHECK ON ",
      new Date().toISOString(),
      ` isSuccess=${isSuccess}, errorMsg=${errorMsg}`,
    )
    if (!isSuccess) {
      send(`ตื่นๆๆๆๆ มีเรื่องแล้ว ${errorMsg}`).catch((err) => {
        console.log("cannot send the message to line noti")
      })
    }
  }
  const job = new CronJob(
    "0 * * * *", //every hour
    task,
    null, //on completed
    true, //start
    "Asia/Bangkok",
  )

  job.start()
  console.log("job started", process.env.LINE_NOTIFY_TOKEN)
}

main().catch((err) => console.error(err.toString()))
