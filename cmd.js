const spawn = require("child_process").spawn

const execute = (command, options) => {
  const childProcess = spawn("bash", ["-c", command], options)
  return new Promise((resolve, reject) => {
    let stdout = ""

    const timeout = setTimeout(() => {
      resolve({ code: 999, data: stdout })
    }, 10000)

    if (childProcess.stdout) {
      childProcess.stdout.on("data", (data) => {
        stdout += data
      })
    }

    childProcess.on("error", function (error) {
      reject({ code: 1, error: error })
    })

    childProcess.on("close", function (code) {
      if (timeout) {
        clearTimeout(timeout)
      }

      if (code > 0) {
        reject({ code: code, error: "Command failed with code " + code })
      } else {
        resolve({ code, data: stdout })
      }
    })
  })
}

const exec = (command, { capture = false, echo = false, cwd } = {}) => {
  if (echo) {
    console.log(command)
  }

  return execute(command, {
    stdio: capture ? "pipe" : "inherit",
    ...(cwd && { cwd }),
  })
}

module.exports = {
  exec,
  execute,
}
