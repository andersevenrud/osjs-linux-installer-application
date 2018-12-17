import osjs from 'osjs';
import {name as applicationName} from './metadata.json';

import {app,h} from 'hyperapp';

import {Box,BoxContainer,Button,listView,Progressbar,SelectField,Statusbar,TextareaField,TextField,ToggleField} from '@osjs/gui';

const register = (core,args,options,metadata) => {
  const proc = core.make('osjs/application',{args,options,metadata});
  const {translatable} = core.make('osjs/locale');
  const _ = translatable(require('./locales.js'));
  const hw = core.make('hw');
  
  const views = {
    'lang': (state,actions) => {
      const LangListView = listView.component(state.langsList,actions.langsList);
      return h(Box,{ grow: 1, padding: false },[
        h('h3',{},[_('VIEW_LANG')]),
        h(LangListView,{ grow: 1, shrink: 1 },[]),
        h(Button,{ label: _('VIEW_NEXT'), onclick: ev => proc.emit('change-view','disks') }),
        h(Progressbar,{ value: Math.round((0/Object.keys(views).length)*100) },[])
      ]);
    },
    'disks': (state,actions) => {
      const DisksListView = listView.component(state.disksList,actions.disksList);
      return h(Box,{ grow: 1, padding: false },[
        h('h3',{},[_('VIEW_DISKS')]),
        h(DisksListView,{ grow: 1, shrink: 1 },[]),
        h(ToggleField,{ checked: state.disk.efi, label: _('DISKS_EFI'), onchange: (ev,val) => proc.emit('set-efi',val) },[]),
        h(Button,{ label: _('VIEW_PREV'), onclick: ev => proc.emit('change-view','lang') }),
        h(Button,{ label: _('VIEW_NEXT'), onclick: ev => proc.emit('change-view','users') }),
        h(Progressbar,{ value: Math.round((1/Object.keys(views).length)*100) },[])
      ]);
    },
    'users': (state,actions) => {
      if(state.disk.disk == null) {
        core.make('osjs/dialog','alert',{
          message: _('DISK_NONE')
        },(btn,value) => {}); 
        return proc.emit('change-view','disks');
      }
      const UsersListView = listView.component(state.usersList,actions.usersList);
      return h(Box,{ grow: 1, padding: false },[
        h('h3',{},[_('VIEW_USERS')]),
        h(UsersListView,{ grow: 1, shrink: 1 },[]),
        h(Button,{ label: _('VIEW_PREV'), onclick: ev => proc.emit('change-view','disks') }),
        h(Button,{ label: _('VIEW_NEXT'), onclick: ev => proc.emit('change-view','personalization') }),
        h(Progressbar,{ value: Math.round((2/Object.keys(views).length)*100) },[])
      ]);
    },
    'personalization': (state,actions) => {
      return h(Box,{ grow: 1, padding: false },[
        h('h3',{},[_('VIEW_PERSONALIZATION')]),
        h(Box,{},[
          h(BoxContainer,{},_('PERSONALIZATION_HOSTNAME')),
          h(TextField,{
            value: state.personalization.hostname,
            oninput: (ev,value) => actions.personalization.setOption({ key: 'hostname',value })
          })
        ]),
        h(ToggleField,{
          checked: state.personalization.autologin,
          label: _('PERSONALIZATION_AUTOLOGIN'),
          onchange: (ev,value) => actions.personalization.setOption({ key: 'autologin',value })
        }),
        h(SelectField,{
          disabled: !state.personalization.autologin,
          value: state.personalization.autologinUser,
          choices: state.usersList.rows.reduce((obj,item) => {
            obj[item.data.username] = item.data.username;
            return obj;
          },{}),
          onchange: (ev,value) => actions.personalization.setOption({ key: 'autologinUser',value })
        },[
        ]),h(Button,{ label: _('VIEW_PREV'), onclick: ev => proc.emit('change-view','disks') }),
        h(Button,{ label: _('VIEW_NEXT'), onclick: ev => {
          proc.emit('change-view','installing');
          proc.emit('install-start');
        } }),
        h(Progressbar,{ value: Math.round((3/Object.keys(views).length)*100) },[])
      ]);
    },
    'installing': (state,actions) => {
      if(/^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/.test(state.personalization.hostname) == false) {
        core.make('osjs/dialog','alert',{
          message: _('PERSONALIZATION_BADHOSTNAME')
        },(btn,value) => {}); 
        return proc.emit('change-view','personalization');
      }
      if(state.personalization.autologin && (state.personalization.autologinUser == null || state.personalization.autologinUser == 'root')) {
        core.make('osjs/dialog','alert',{
          message: _('PERSONALIZATION_BADAUTOLOGINUSER')
        },(btn,value) => {}); 
        return proc.emit('change-view','personalization');
      }
      return h(Box,{ grow: 1, padding: false },[
        h('h3',{},[_('VIEW_INSTALLING')]),
        h(TextareaField,{ disabled: true, style: { color: 'black' } },state.installLog),
        h(Progressbar,{ value: state.installProgress },[])
      ]);
    }
  };
  
  const view = (state,actions) => views[state.view];
  
  proc.createWindow({
    id: 'OSjsInstallerWindow',
    title: _('WIN_TITLE'),
    dimension: {width: 400, height: 400},
    position: {left: 700, top: 200}
  }).on('destroy',() => proc.destroy()).render(($content,win) => {
    hw.storage.devices().then(disks => {
      const filteredDisks = disks.filter(d => d.type == 'disk');
      const hyperapp = app({
        personalization: {
          hostname: 'osjs',
          autologin: false,
          autologinUser: 'osjs'
        },
        disk: {
          efi: true,
          disk: null
        },
        
        lang: 'en_EN',
        langsList: listView.state({
          columns: [_('LIST_LANGS')],
          rows: Object.keys(core.config('languages')).map(lang => ({
            columns: [core.config('languages')[lang]],
            data: lang
          }))
        }),
        
        disksList: listView.state({
          columns: [_('LIST_DISKS_NAME'),_('LIST_DISKS_SIZE')],
          rows: filteredDisks.map(elem => ({
            columns: [elem.name,Math.round(elem.size/1024/1024/1024)+'GB'],
            data: elem
          }))
        }),
        
        usersList: listView.state({
          columns: [_('LIST_USERS_NAME'),_('LIST_USERS_DESC')],
          rows: [{
            columns: ['osjs',_('USER_OSJS_DESC')],
            data: { username: 'osjs', password: 'osjs', description: _('USER_OSJS_DESC') }
          },{
            columns: ['root',_('USER_ROOT_DESC')],
            data: { username: 'root', password: 'linux', description: _('USER_ROOT_DESC') }
          }]
        }),
        
        view: 'lang',
        installProgress: 0,
        installLog: []
      },{
        clearLog: () => ({ installLog: [] }),
        updateLog: message => (state,actions) => ({installLog: [...state.installLog,message]}),
        personalization: {
          setOption: ({key,value}) => state => Object.assign({},state,{[key]: value})
        },
        disk: {
          setOption: ({key,value}) => state => Object.assign({},state,{[key]: value})
        },
      
        setView: view => ({view}),
        setLang: lang => ({lang}),
        setDisk: disk => ({disk}),
        setInstallProgress: installProgress => ({installProgress}),
        
        startInstalling: () => (state,actions) => {
          actions.setInstallProgress(0);
          actions.clearLog();
          const ws = proc.socket('/install');
          ws.on('open',() => {
            ws.send(JSON.stringify({
              lang: state.lang,
              personalization: state.personalization,
              disk: state.disk,
              users: state.usersList.rows.map(row => row.data)
            }));
            ws.on('error',err => {
              core.make('osjs/dialog','alert',{
                message: err.message,
                title: err.name
              },(btn, value) => {});
            });
            ws.on('message',ev => {
              let pkt = JSON.parse(ev.data.toString());
              switch(pkt.type) {
                case 'progress': proc.emit('install-progress',pkt.value);
                  break;
                case 'log':
                  actions.updateLog(pkt.std+': '+pkt.data+'\n');
                  break;
              }
            });
            ws.on('close',() => proc.emit('install-progress',100));
          });
        },
        
        langsList: listView.actions({
          select: ({data,index,ev}) => proc.emit('change-lang',data)
        }),
        disksList: listView.actions({
          select: ({data,index,ev}) => {
            if(Math.round(data.size/1024/1024/1024) < 1) return core.make('osjs/dialog','alert',{
              message: _('DISK_SMALL',data.name)
            },(btn, value) => {});
            proc.emit('change-disk',data);
          }
        }),
        usersList: listView.actions({
          addRow: row => state => ([...state.rows,row]),
          removeRow: row => state => {
            const rows = state.rows;
            const foundIndex = rows.findIndex(r => r === row);
            if(foundIndex !== -1) rows.splice(foundIndex,1);
            return {rows};
          },
          contextmenu: ({data,index,ev}) => {
            core.make('osjs/contextmenu',{
              position: ev.target,
              menu: [
                { label: _('LIST_USERS_ADD'), onclick: ev => {
                  core.make('osjs/dialog','prompt',{
                    message: _('USERS_NAME')
                  },(btn,username) => {
                    if(btn == 'ok') {
                      core.make('osjs/dialog','prompt',{
                        message: _('USERS_PASSWD')
                      },(btn,password) => {
                        if(btn == 'ok') {
                          core.make('osjs/dialog','prompt',{
                            message: _('USERS_DESC')
                          },(btn,description) => {
                            if(btn == 'ok') proc.emit('user-add',{
                              data: { username, password, description },
                              columns: [username,description]
                            });
                          });
                        }
                      });
                    }
                  }); 
                } },
                {
                  label: _('LIST_USERS_REMOVE'),
                  disabled: data.username == 'osjs' || data.username == 'root',
                  onclick: ev => data.username == 'osjs' || data.username == 'root' ? null : proc.emit('user-remove',{
                    columns: [data.username], data
                  })
                },
                { label: _('LIST_USERS_EDIT_PASSWD'), onclick: ev => {
                  core.make('osjs/dialog','prompt',{
                    message: _('USERS_PASSWD')
                  },(btn,password) => {
                    if(password == data.password) return core.make('osjs/dialog','alert',{
                      message: _('USERS_PASSWD_SAME')
                    },(btn,val) => {});
                    proc.emit('user-remove',{ columns: [data.username], data });
                    proc.emit('user-add',{
                      columns: [data.username,data.description],
                      data: { username: data.username, password, description: data.description }
                    });
                  });
                } }
              ]
            });
          }
        })
      },view,$content);
      proc.on('install-progress',val => hyperapp.setInstallProgress(val));
      proc.on('set-efi',val => hyperapp.setEFI(val));
      proc.on('install-start',() => hyperapp.startInstalling());
      proc.on('change-disk',disk => hyperapp.disk.setOption({ key: 'disk', value: disk }));
      proc.on('user-remove',user => hyperapp.usersList.removeRow(user));
      proc.on('user-add',user => hyperapp.usersList.addRow(user));
      proc.on('change-lang',lang => {
        core.make('osjs/locale').setLocale(lang);
        hyperapp.setLang(lang);
      });
      proc.on('change-view',view => hyperapp.setView(view));
    });
  });
  return proc;
};
osjs.register(applicationName,register);
