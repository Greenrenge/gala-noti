const { execute, exec } = require("./cmd")
const { send } = require("./fireNoti")
const get = require("lodash/get")
const { join } = require("path")

var CronJob = require("cron").CronJob

const mapStdout = (stdout) => {
  const gtIndex = stdout
    .split("\n")
    .findIndex((line) => line.includes("Name") && line.includes("Status"))
  const lines = stdout.split("\n").slice(gtIndex + 1)
  return lines
    .map((l) => ({
      name: l.split(/[\s\t]+/gi)[0],
      status: l.split(/[\s\t]+/gi)[1],
      cpu: l.split(/[\s\t]+/gi)[2],
      memory: l.split(/[\s\t]+/gi)[3],
      runningTime: l.split(/[\s\t]+/gi)[4],
    }))
    .filter((a) => a.name)
}
async function main() {
  const checker = async function () {
    try {
      const { code, data } = await execute("gala-node status")
      if (code != 0 && code != 999) {
        return [false, "process exit with non-zero return"]
      }

      if (code == 999) {
        //timeout
        send(`node check stats failed :: \n${data}`)
        return [false, "TIMEOUT", true]
      }

      try {
        const parsed = mapStdout(data)
        if (parsed.length == 0) {
          send(`cannot parse data stdout to array :: \n${data}`)
          return [false, "CANNOT PARSE STDOUT", true]
        } else if (parsed.filter((a) => a.status !== "Running").length) {
          send(`Some node is not running :: \n${data}`)
          return [false, "SOME NODE NOT RUNNING", true]
        }
        return [true]
      } catch (err) {
        console.log("error parse std ", err)
        return [false, "cannot parse the stdout"]
      }
    } catch (err) {
      return [false, "FAIL TO EXEC"]
    }
  }
  const task = async () => {
    const [isSuccess, errorMsg, notSend] = (await checker()) || [
      false,
      "",
      true,
    ]
    console.log(
      "CHECK ON ",
      new Date().toISOString(),
      ` isSuccess=${isSuccess}, errorMsg=${errorMsg}`,
    )
    if (!isSuccess && !notSend) {
      send(`ERROR OCCURRED ==> ${errorMsg}`).catch((err) => {
        console.log("cannot send the message to line noti ", err)
      })
    }
  }

  const job = new CronJob(
    "*/15 * * * *", //every 15 min
    task,
    null, //on completed
    true, //start
    "Asia/Bangkok",
  )
  task()
  job.start()
  console.log("job started", `lineToken=${process.env.LINE_NOTIFY_TOKEN} `)
  send("gala-node just started")
}

main().catch((err) => console.error(err.toString()))
