const Client = require('ssh2').Client;
const dir = require('node-dir');
const os = require('os');
const fs = require('fs');


let localPath = '';
let remotePath = '';

const createFiles = (sftp, files) =>
  new Promise((resolve, reject) => {
    for (let i = 0; i < files.length; i++) {
      const filename = files[i].replace('public/', '');
      const local = `${localPath}/${filename}`;
      const remote = `${remotePath}/${filename}`;

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
      const dirName = `${remotePath}/${dirs[i].replace('public/', '')}`;

      sftp.exists(dirName, exist => {
        !exist &&
          sftp.mkdir(dirName, err => {
            if (err) console.log(err);
            if (dirs.length === i + 1) resolve();
          });
        if (dirs.length === i + 1) resolve();
      });
    }
  });

const defaultKeyPath = fs.readFileSync(`${os.homedir()}/.ssh/id_rsa`);

const deploy = (options, paths) => {

  const config = {
    privateKey: options.key || defaultKeyPath,
    ...options
  }

  localPath = paths.local || '';
  remotePath = paths.remote || '';

  const conn = new Client();
  conn
    .on('ready', () => {
      console.log('Client :: ready');

      conn.sftp((err, sftp) => {
        if (err) throw err;
        dir.files(localPath, 'all', async (err, paths) => {
          const dirs = paths.dirs;
          const files = paths.files;

          await createDir(sftp, dirs);
          await createFiles(sftp, files);

          console.log('Client :: Upload done');
          conn.end();
        });
      });
    })
    .connect(config);
};

module.exports = deploy;
