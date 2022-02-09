const { execute, exec } = require("./cmd")
const { send } = require("./fireNoti")
const get = require("lodash/get")
const lowdb = require("lowdb")
const FileSync = require("lowdb/adapters/FileSync")
const { join } = require("path")

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
      await db.set("rebooted", true).write()
      await exec("sudo reboot", { echo: true })
    } catch (err) {}
  } else {
    //already reboot then
    console.log("REBOOTED --> config device")
    await exec("gala-node config device", {
      echo: true,
      capture: true,
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
        const parsedArr = data.split("\n").map((d) => {
          try {
            return JSON.parse(d)
          } catch (err) {
            return undefined
          }
        })

        if (!get(parsedArr[0], "summary")) {
          //restart needed
          send(`node restart needed \n${JSON.stringify(data)}`)
          try {
            await rebootCheck()
          } catch (err) {}
          // execute(`systemctl restart gala-node`).then((res) => {
          //   console.log("res", res)
          //   task()
          // })
          return
        }
      }

      try {
        const parsed = JSON.parse(data)

        if (!get(parsed, "summary")) {
          //restart needed
          send(
            `node restart needed \n${Object.entries(parsed)
              .map(([k, v]) => ` [${k}]=${v} `)
              .join("\n")}`,
          )
          await rebootCheck()
          // execute(`systemctl restart gala-node`).then((res) => {
          //   console.log("res", res)
          //   task()
          // })
          return
        }

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
        console.log("cannot send the message to line noti ", err)
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
  task()
  job.start()
  console.log("job started", process.env.LINE_NOTIFY_TOKEN)
}

main().catch((err) => console.error(err.toString()))
