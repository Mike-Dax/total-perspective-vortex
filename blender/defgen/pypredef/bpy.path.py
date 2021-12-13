'''Path Utilities (bpy.path)
   This module has a similar scope to os.path, containing utility
   functions for dealing with paths in Blender.
   
'''


#unable to describe the 'abspath' method due to internal error

def basename(path):
   '''Equivalent to os.path.basename, but skips a "//" prefix.
      Use for Windows compatibility.
      
      @returns (str): The base name of the given path.
   '''

   return str

#unable to describe the 'clean_name' method due to internal error

#unable to describe the 'display_name' method due to internal error

def display_name_from_filepath(name):
   '''Returns the path stripped of directory and extension,
      ensured to be utf8 compatible.
      
      Arguments:
      @name (string): The file path to convert.

      @returns (str): The display name.
   '''

   return str

def display_name_to_filepath(name):
   '''Performs the reverse of display_name using literal versions of characters
      which aren't supported in a filepath.
      
      Arguments:
      @name (string): The display name to convert.

      @returns (str): The file path.
   '''

   return str

#unable to describe the 'ensure_ext' method due to internal error

def is_subdir(path, directory):
   '''Returns true if *path* in a subdirectory of *directory*.
      Both paths must be absolute.
      
      Arguments:
      @path (string or bytes): An absolute path.

      @returns (bool): Whether or not the path is a subdirectory.
   '''

   return bool

#unable to describe the 'module_names' method due to internal error

def native_pathsep(path):
   '''Replace the path separator with the systems native os.sep.
      
      Arguments:
      @path (string): The path to replace.

      @returns (str): The path with system native separators.
   '''

   return str

def reduce_dirs(dirs):
   '''Given a sequence of directories, remove duplicates and
      any directories nested in one of the other paths.
      (Useful for recursive path searching).
      
      Arguments:
      @dirs (sequence of strings): Sequence of directory paths.

      @returns ([str]): A unique list of paths.
   '''

   return [str]

#unable to describe the 'relpath' method due to internal error

def resolve_ncase(path):
   '''Resolve a case insensitive path on a case sensitive system,
      returning a string with the path if found else return the original path.
      
      Arguments:
      @path (string): The path name to resolve.

      @returns (str): The resolved path.
   '''

   return str

