const express = require("express");
const fileUpload = require("express-fileupload");
const { exec } = require("child_process");
const pino = require('pino');
require('dotenv').config()

const transport = pino.transport({
    target: "@logtail/pino",
    options: { sourceToken: process.env.LOGTAIL_KEY }
});
const logger = pino(transport);

const deploymentSecret = process.env.DEPLOYMENT_SECRET;
const processName = 'prod';
const port = 3005;

const app = express();
app.use(fileUpload());

app.get("/", (req, res) => {
    res.redirect("http://localhost:3000/");
});

function executeScript(filename) {

exec(`
sudo ./slack.sh "Deployment started :repeat_one:"
`, (error) => {
  if (error) {
    logger.info(`[Pre-deploy] inline Error: ${error}`);
  } else {
    logger.info(`[Pre-deploy] executed successfully`);
  }
});

    exec('pm2 list', (error, stdout, stderr) => {
        if (error) {
            logger.error(`Error checking PM2 processes: ${error}`);
            return;
        }

        if (stdout.includes(processName)) {
            exec(`pm2 stop ${processName} && pm2 delete ${processName}`, (error) => {
                if (error) {
                    logger.error(`Error stopping/deleting PM2 process: ${error}`);
                } else {
                    logger.info(`${processName} stopped and deleted successfully.`);
                    deployAndTest(filename);
                }
            });
        } else {
            logger.info(`${processName} not found Skipping stop and delete.`);
            deployAndTest(filename);
        }
    });
}


function deployAndTest(filename) {
    try {
        exec(`
        cd .. &&
        rm -rf api &&
        mkdir api &&
        cp ./deploy/${filename} ./api/${filename} &&
        cd api &&
        unzip ${filename} &&
        npm i &&
        npm run deploy:prod &&
        pm2 save &&
        curl https://raw.githubusercontent.com/mkyai/scripts/master/test.sh -o test.sh &&
        chmod +x ./test.sh &&
        sudo ./test.sh
      `, (error) => {
            if (error) {
                logger.info(`[DeployAndTest] inline Error: ${error}`);
            } else {
                logger.info(`[DeployAndTestScript] executed successfully`);
            }
        });
    } catch (error) {
        logger.info(`Error in executing script [DeployAndTest] : ${error}`);
    }
}


app.post("/sync-code", (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send("No files were uploaded.");
    }

    const uploadedFile = req.files[Object.keys(req.files)[0]];
    const filename = uploadedFile.name;

    uploadedFile.mv(`./${filename}`, (err) => {
        if (err) {
            return res
                .status(500)
                .send(`Error occurred while saving the file.${err}`);
        }

        executeScript(filename);
        return res.send("File uploaded and saved successfully.");
    });
});

app.listen(port, () => {
    console.log("Server Runing")
    logger.info(`[DEPLOYMENT] Server is running on port ${port}`);
});
