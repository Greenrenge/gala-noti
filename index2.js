const { execute, exec } = require("./cmd")
const { send } = require("./fireNoti")
const get = require("lodash/get")
const lowdb = require("lowdb")
const FileSync = require("lowdb/adapters/FileSync")
const { join } = require("path")

const enableAutoReboot = process.env.AUTO_REBOOT === "true"

const adapter = new FileSync(join(__dirname, "db.json"))
const db = lowdb(adapter)

var CronJob = require("cron").CronJob
/**
 *
 * {"timestamp":"2022-02-08T05:20:37.739Z","level":"\u001b[31merror\u001b[39m","message":"caught err in stats: Error: Request failed with status code 502"}
 */

const states = {
  setHasReboot() {},
}

async function rebootCheck() {
  await db.read()
  if (!db.get("rebooted").value()) {
    try {
      await exec("sudo rm /etc/machine-id /var/lib/dbus/machine-id", {
        echo: true,
      })
    } catch (err) {}
    try {
      await exec("sudo dbus-uuidgen | sudo tee /etc/machine-id", { echo: true })
    } catch (err) {}
    try {
      await exec("sudo cp /etc/machine-id /var/lib/dbus/machine-id", {
        echo: true,
      })
    } catch (err) {}
    try {
      console.log("GONNA REBOOT")
      send(`node is going to reboot.....`)
      await db.set("rebooted", true).write()
      await exec("sudo reboot", { echo: true })
    } catch (err) {
      send(`node error to reboot.....${err}`)
    }
  } else {
    //already reboot then
    send(`node has been rebooted`)
    console.log("REBOOTED --> config device")
    await exec("gala-node config device", {
      echo: true,
      capture: true,
      noTimeout: true,
      handler: (stdout) => {
        console.log("handler", stdout.toString())
        send(stdout.toString())
      },
    })
    await db.set("rebooted", false).write()
  }
}

async function main() {
  await db.defaults({ rebooted: false }).write()
  const checker = async function () {
    try {
      const { code, data } = await execute("gala-node stats")

      if (code != 0 && code != 999) {
        return [false, "process exit with non-zero return"]
      }

      if (code == 999) {
        // timeout
        const parsedArr = data.split("\n").map((d) => {
          try {
            return JSON.parse(d)
          } catch (err) {
            return undefined
          }
        })
        send(`node check stats failed due to \n${JSON.stringify(data)}`)
        return [false, "TIMEOUT", true]
      }

      try {
        const parsed = JSON.parse(data)

        if (!get(parsed, "summary")) {
          send(
            `node restart needed \n${Object.entries(parsed)
              .map(([k, v]) => ` [${k}]=${v} `)
              .join("\n")}`,
          )
          if (enableAutoReboot) {
            await rebootCheck()
          }
          console.log("done reboot check#2")
          return [false, "REBOOT DUE TO NOT FIND SUMMARY", true]
        }

        console.log("json got normal", parsed)

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
        console.log("error parse std ", err)
        return [false, "cannot parse the stdout"]
      }
    } catch (err) {
      console.log("error command failed ", err)
      send("process stopped or failed to run maybe need to re-login")

      // re-auth
      await exec("gala-node config device", {
        echo: true,
        capture: true,
        noTimeout: true,
        handler: (stdout) => {
          console.log("handler", stdout.toString())
          send(stdout.toString())
        },
      })

      return [
        false,
        "process stopped or failed to run maybe need to re-login",
        true, // not send
      ]
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
