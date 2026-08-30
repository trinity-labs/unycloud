# Installation

UnyCloud is a single binary and can be used as standalone executable. It is a
maintained fork of File Browser and preserves the existing `filebrowser` CLI,
config, database, and `FB_*` environment behavior.

## Binary

Download `unycloud` from the
[UnyCloud releases page](https://github.com/trinity-labs/unycloud/releases) or
build it locally:

```sh
scripts/build.sh
```

Run it directly:

```sh
./dist/unycloud -r /path/to/your/files
```

Existing services that execute `/usr/local/bin/filebrowser` can keep doing so.
Install the UnyCloud artifact to that legacy path inside a mounted server root:

```sh
UNYCLOUD_INSTALL_ROOT=/mnt/server-root scripts/install-legacy-filebrowser.sh
```

UnyCloud is now up and running. Read the ["First Boot"](#first-boot) section for
more information.

## Docker

UnyCloud v0.6.22 is published as binary archives. The Docker setup in this
repository is intentionally local and generic: build the binary first, then
build the image from this working tree.

```sh
scripts/build.sh
docker build -t unycloud:local .
```

The container keeps File Browser-compatible paths and still runs the executable
as `/bin/filebrowser` internally.

### Local BusyBox Image

```sh
docker run \
    -v filebrowser_data:/srv \
    -v filebrowser_database:/database \
    -v filebrowser_config:/config \
    -p 8080:80 \
    unycloud:local
```

Where `filebrowser_data`, `filebrowser_database` and `filebrowser_config` are
Docker [volumes](https://docs.docker.com/engine/storage/volumes/), where the
data, database and configuration will be stored, respectively. The default
configuration and database will be automatically initialized.

The default user that runs File Browser inside the container has UID 1000 and GID 1000. If, for one reason or another, you want to run the Docker container with a different user, please consult Docker's [user documentation](https://docs.docker.com/engine/containers/run/#user).

> [!NOTE]
>
> When using [bind mounts](https://docs.docker.com/engine/storage/bind-mounts/), that is, when you mount a path on the host in the container, you must manually ensure that they have the correct **permissions**. Docker does not do this automatically for you. The host directories must be readable and writable by the user running inside the container. You can use the [`chown`](https://linux.die.net/man/1/chown) command to change the owner of those paths.

UnyCloud is now up and running. Read the ["First Boot"](#first-boot) section for
more information.

## First Boot

Your instance is now up and running. UnyCloud will automatically bootstrap a
File Browser-compatible database, in which the configuration and the users are
stored. You can find the address in which your instance is running, as well as
the randomly generated password for the user `admin`, in the console logs.

> [!WARNING]
>
> The automatically generated password for the user `admin` is only displayed
> once. If you fail to remember it, you will need to manually delete the
> database and start UnyCloud again.

Although this is the fastest way to bootstrap an instance, we recommend you to take a look at other possible options, by checking [`config init`](cli/filebrowser-config-init.md) and [`config set`](cli/filebrowser-config-set.md), to make the installation as safe and customized as it can be.

If your goal is to have a public-facing deployment, we recommend taking a look at the [deployment](deployment.md) page for more information on how you can secure your installation.
