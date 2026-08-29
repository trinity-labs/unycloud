package runner

import (
	"strings"

	"github.com/filebrowser/filebrowser/v2/settings"
)

// ParseCommand parses the command taking in account if the current
// instance uses a shell to run the commands or just calls the binary
// directly.
func ParseCommand(s *settings.Settings, raw string) (command []string, name string, err error) {
	name, args, err := SplitCommandAndArgs(raw)
	if err != nil {
		return
	}

	if len(s.Shell) == 0 || s.Shell[0] == "" {
		command = append(command, name)
		command = append(command, args...)
	} else {
		command = append(command, s.Shell...)
		command = append(command, raw)
	}

	return command, name, nil
}

// HasShellControlOperator reports whether a user-provided command contains
// shell metacharacters that would make a first-token allowlist ineffective.
func HasShellControlOperator(raw string) bool {
	name, args, err := SplitCommandAndArgs(raw)
	if err != nil {
		return true
	}

	return hasShellControl(name) || slicesContainControl(args)
}

func slicesContainControl(args []string) bool {
	for _, arg := range args {
		if hasShellControl(arg) {
			return true
		}
	}
	return false
}

func hasShellControl(arg string) bool {
	if strings.ContainsAny(arg, ";&|<>`\n\r") {
		return true
	}

	return strings.Contains(arg, "$(") || strings.Contains(arg, "${")
}
