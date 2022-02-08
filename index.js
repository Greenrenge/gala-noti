const { execute } = require("./cmd")
const { send } = require("./fireNoti")

var CronJob = require("cron").CronJob

async function main() {
  const task = async function () {
    const { code, data } = execute("gala-node stats")
    console.log(code)
  }
  const job = new CronJob(
    "0 * * * *", //every hour
    task,
    null, //on completed
    true, //start
    "Asia/Bangkok",
  )

  job.start()
  console.log("job started")
}

main().catch((err) => console.error(err.toString()))
