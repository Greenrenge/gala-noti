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
  return lines.map((l) => ({
    name: l.split(/[\s\t]+/gi)[0],
    status: l.split(/[\s\t]+/gi)[1],
    cpu: l.split(/[\s\t]+/gi)[2],
    memory: l.split(/[\s\t]+/gi)[3],
    runningTime: l.split(/[\s\t]+/gi)[4],
  }))
}
async function main() {
  const checker = async function () {
    try {
      const { code, data } = await execute("gala-node status")
      if (code != 0 && code != 999) {
        return [false, "process exit with non-zero return"]
      }
      console.log(data)
      const parsed = mapStdout(data)
      console.log(parsed)

      // if (code == 999) {
      //   // timeout
      //   // const parsedArr = data.split("\n").map((d) => {
      //   //   try {
      //   //     return JSON.parse(d)
      //   //   } catch (err) {
      //   //     return undefined
      //   //   }
      //   // })
      //   send(`node check stats failed due to \n${JSON.stringify(data)}`)
      //   return [false, "TIMEOUT", true]
      // }

      // try {
      //   const parsed = JSON.parse(data)

      //   if (!get(parsed, "summary")) {
      //     send(
      //       `node restart needed \n${Object.entries(parsed)
      //         .map(([k, v]) => ` [${k}]=${v} `)
      //         .join("\n")}`,
      //     )
      //     if (enableAutoReboot) {
      //       await rebootCheck()
      //     }
      //     console.log("done reboot check#2")
      //     return [false, "REBOOT DUE TO NOT FIND SUMMARY", true]
      //   }

      //   console.log("json got normal", parsed)

      //   if (+get(parsed, "summary.nodesOnline", 0) !== 1) {
      //     return [false, "NODE IS OFFLINE !!!!!!!"]
      //   }
      //   if (
      //     get(parsed, "summary.currentVersion") !==
      //     get(parsed, "summary.latestVersion")
      //   ) {
      //     return [false, "NODE NEEDS TO UPDATE VERSION !!"]
      //   }
      //   return [true]
      // } catch (err) {
      //   console.log("error parse std ", err)
      //   return [false, "cannot parse the stdout"]
      // }
    } catch (err) {}
    //   console.log("error command failed ", err)
    //   send("process stopped or failed to run maybe need to re-login")

    //   // re-auth
    //   await exec("gala-node config device", {
    //     echo: true,
    //     capture: true,
    //     noTimeout: true,
    //     handler: (stdout) => {
    //       console.log("handler", stdout.toString())
    //       send(stdout.toString())
    //     },
    //   })

    //   return [
    //     false,
    //     "process stopped or failed to run maybe need to re-login",
    //     true, // not send
    //   ]
    // }
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
