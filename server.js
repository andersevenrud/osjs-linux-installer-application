const child_process = require('child_process');
const fs = require('fs');

module.exports = (core,proc) => ({
  init: async () => {
    core.app.ws(proc.resource('/install'),(ws,req) => {
      ws.once('message',data => {
        let {lang,disk,personalization,users} = JSON.parse(data.toString());
        const send = data => ws.send(JSON.stringify(data));
        const setProgress = value => send({ type: 'progress', value });
        const executeCommand = (cmd,args) => {
          const proc = child_process.spawn(cmd,args);
          proc.stdout.on('data',data => send({ type: 'log', std: 'out', data: data.toString() }));
          proc.stderr.on('data',data => send({ type: 'log', std: 'err', data: data.toString() }));
          return proc;
        };
        
        fs.writeFileSync(__dirname+'/install-data.json',JSON.stringify({lang,disk,personalization,users}));
        let sudo = executeCommand(__dirname+'/install.sh',[__dirname]);
        sudo.stdin.write('osjs\n');
        sudo.on('close',() => ws.close());
      });
    });
  },
  start: () => {},
  destroy: () => {},
});
