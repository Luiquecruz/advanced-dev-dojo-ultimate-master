"""An in-memory file system with POSIX paths, standing in for the disk of the agent's machine."""

import errno
import posixpath


class MemoryFileSystem:
    """Files and folders kept in memory. Relative paths resolve against `cwd`; there are no symbolic links."""

    def __init__(self, cwd="/app"):
        self.cwd = cwd
        self._files = {}
        self._directories = {"/"}
        self.make_directories(cwd)

    def absolute(self, path):
        """The absolute, normalized form of `path`."""
        return posixpath.normpath(posixpath.join(self.cwd, path))

    def exists(self, path):
        target = self.absolute(path)
        return target in self._files or target in self._directories

    def read_file(self, path):
        """The text of a file; raises FileNotFoundError or IsADirectoryError."""
        target = self.absolute(path)
        if target in self._directories:
            raise IsADirectoryError(errno.EISDIR, "Is a directory", target)
        if target not in self._files:
            raise FileNotFoundError(errno.ENOENT, "No such file or directory", target)
        return self._files[target]

    def write_file(self, path, content):
        """Creates or replaces a file; its parent folder must exist."""
        target = self.absolute(path)
        if posixpath.dirname(target) not in self._directories:
            raise FileNotFoundError(errno.ENOENT, "No such file or directory", target)
        if target in self._directories:
            raise IsADirectoryError(errno.EISDIR, "Is a directory", target)
        self._files[target] = content

    def append_file(self, path, content):
        """Appends to a file, creating it when missing; its parent folder must exist."""
        target = self.absolute(path)
        self.write_file(target, self._files.get(target, "") + content)

    def rename(self, source, destination):
        """Moves a file to a new path, replacing what is there; the move is atomic."""
        source_path = self.absolute(source)
        content = self.read_file(source_path)
        self.write_file(destination, content)
        del self._files[source_path]

    def remove_tree(self, path):
        """Deletes a file or a folder with everything inside it, like `rm -rf`; a missing path is ignored."""
        target = self.absolute(path)
        inside = f"{target.rstrip('/')}/"
        self._files = {name: content for name, content in self._files.items() if name != target and not name.startswith(inside)}
        self._directories = {name for name in self._directories if name == "/" or (name != target and not name.startswith(inside))}

    def make_directories(self, path):
        """Creates a folder and every missing parent, like `mkdir -p`."""
        target = self.absolute(path)
        while target not in self._directories:
            if target in self._files:
                raise NotADirectoryError(errno.ENOTDIR, "Not a directory", target)
            self._directories.add(target)
            target = posixpath.dirname(target)

    def list_directory(self, path):
        """The names of the entries of a folder, in no particular order."""
        target = self.absolute(path)
        if target in self._files:
            raise NotADirectoryError(errno.ENOTDIR, "Not a directory", target)
        if target not in self._directories:
            raise FileNotFoundError(errno.ENOENT, "No such file or directory", target)
        entries = [*self._directories, *self._files]
        return [posixpath.basename(entry) for entry in entries if entry != "/" and posixpath.dirname(entry) == target]

    def write_files(self, files):
        """Writes several files at once, creating their folders: `{"workspace/README.md": "# Shop"}`."""
        for path, content in files.items():
            self.make_directories(posixpath.dirname(self.absolute(path)))
            self.write_file(path, content)


file_system = MemoryFileSystem()
