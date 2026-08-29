# Command Execution

> [!CAUTION]
>
> The **hook runner** and **interactive shell** functionalities have been disabled for all existent and new installations by default from version v2.33.8 and onwards, due to continuous and known security vulnerabilities. You should only use this feature if you are aware of all of the security risks involved. For more up to date information, consult issue [#5199](https://github.com/filebrowser/filebrowser/issues/5199).

## Hook Runner

The hook runner is a feature that enables you to execute any shell command you want before or after a certain event. Right now, these are the events:

* Copy
* Rename
* Upload
* Delete
* Save

Also, during the execution of the commands set for those hooks, there will be some environment variables available to help you perform your commands:

* `FILE` with the full absolute path to the changed file.
* `SCOPE` with the path to user's scope.
* `TRIGGER` with the name of the event.
* `USERNAME` with the user's username.
* `DESTINATION` with the absolute path to the destination. Only used for **copy** and **rename.**

At this moment, you can edit the commands via the command line interface, using the following commands \(please check the flag `--help` to know more about them\):

```bash
filebrowser cmds add before_copy "echo $FILE"
filebrowser cmds rm before_copy 0
filebrowser cmds ls
```

Or you can use the web interface to manage them via **Settings** → **Global Settings**.

## Interactive Shell

Within File Browser you can toggle the shell (`< >` icon at the top right) and this will open a shell command window at the bottom of the screen. This functionality can be turned on using the environment variable `FB_DISABLE_EXEC=false` or the flag `--disable-exec=false`.

By default no commands are available as the command list is empty. To enable commands these need to either be done on a per-user basis (including for the Admin user).

You can do this by adding them in Settings > User Management > (edit user) > Commands or to *apply to all new users created from that point forward* they can be set in Settings > Global Settings

> [!NOTE]
> 
> If using a proxy manager then remember to enable websockets support for the File Browser proxy

> [!NOTE]
> 
> If using Docker and you want to add a new command that is not in the base
> image, build a local image first with `scripts/build.sh && docker build -t
> unycloud:local .`, then extend that local image or build your own runtime
> image with the required tools installed. For example:
> 
> ```docker
> FROM unycloud:local
> USER root
> # Install additional tools here using the package manager available in your
> # chosen base image, then switch back to the unprivileged runtime user.
> USER user
> ```
