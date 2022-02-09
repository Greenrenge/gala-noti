const { execute, exec } = require("./cmd")
const { send } = require("./fireNoti")
const get = require("lodash/get")
const { JSONFile, Low } = require("lowdb")
const { dirname, join } = require("path")
const { fileURLToPath } = require("url")

// Use JSON file for storage
const file = join(__dirname, "db.json")
const adapter = new JSONFile(file)
const db = new Low(adapter)

var CronJob = require("cron").CronJob
/**
 *
 * {"timestamp":"2022-02-08T05:20:37.739Z","level":"\u001b[31merror\u001b[39m","message":"caught err in stats: Error: Request failed with status code 502"}
 */

const states = {
  setHasReboot() {},
}

async function reboot() {
  await db.read()
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
    if (!get(db.data, "rebooted")) {
      db.data = { rebooted: true }
      await db.write()
      await exec("sudo reboot", { echo: true })
    }
  } catch (err) {
    //already reboot then
    await exec("gala-node config device", {
      echo: true,
      handler: (stdout) => {
        send(stdout)
      },
    })
    db.data = { rebooted: false }
    await db.write()
  }
}

async function main() {
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
          await db.read()
          db.data = db.data || { rebooted: false }
          await reboot(db)
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
          await reboot()
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
