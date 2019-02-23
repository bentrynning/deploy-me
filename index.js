const Client = require('ssh2').Client;
const dir = require('node-dir');
const os = require('os');
const fs = require('fs');
const path = require('path');

let localPath = '';
let remotePath = '';

const createFiles = (sftp, files) =>
  new Promise((resolve, reject) => {
    for (let i = 0; i < files.length; i++) {
      const filename = files[i];
      const local = path.join(localPath, filename);
      const remote = path.join(remotePath, filename);

      sftp.fastPut(local, remote, err => {
        if (err) console.log(err);
        console.log(`File uploaded: ${local} => ${remote}`);
        if (files.length === i + 1) resolve();
      });
    }
  });

const createDir = (sftp, dirs) =>
  new Promise((resolve, reject) => {
    for (let i = 0; i < dirs.length; i++) {
      const dirName = path.join(remotePath, dirs[i]);

      sftp.exists(dirName, exist => {
        !exist &&
          sftp.mkdir(dirName, err => {
            if (err) console.log(err);
            console.log(`Folder created: ${dirName}`);
            if (dirs.length === i + 1) resolve();
          });
        if (dirs.length === i + 1) resolve();
      });
    }
  });

const defaultKeyPath = fs.readFileSync(`${os.homedir()}/.ssh/id_rsa`);

const deploy = (config, paths) => {
  config = {
    privateKey: config.key || defaultKeyPath,
    ...config
  };

  if (!paths.local || !paths.remote)
    throw new TypeError('Remote and local paths must be included');

  localPath = paths.local;
  remotePath = paths.remote;

  const conn = new Client();
  conn
    .on('ready', () => {
      console.log('Client :: ready');

      conn.sftp((err, sftp) => {
        if (err) throw err;
        dir.files(localPath, 'all', async (err, paths) => {
          const dirs = paths.dirs.map(dir => dir.replace(localPath, ''));
          const files = paths.files.map(dir => dir.replace(localPath, ''));

          await createDir(sftp, dirs);
          await createFiles(sftp, files);

          conn.end();
          console.log('Client :: Upload done');
        });
      });
    })
    .connect(config);
};

module.exports = deploy;
