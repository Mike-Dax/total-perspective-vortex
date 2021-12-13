'''Utilities (bpy.utils)
   This module contains utility functions specific to blender but
   not associated with blenders internal data.
   
'''


#unable to describe the 'app_template_paths' method due to internal error

def blend_paths(absolute=False, packed=False, local=False):
   '''Returns a list of paths to external files referenced by the loaded .blend file.
      
      Arguments:
      @absolute (boolean): When true the paths returned are made absolute.
      @packed (boolean): When true skip file paths for packed data.
      @local (boolean): When true skip linked library paths.

      @returns ([str]): path list.
   '''

   return [str]

def escape_identifier(string):
   '''Simple string escaping function used for animation paths.
      
      Arguments:
      @string (string): text

      @returns (str): The escaped string.
   '''

   return str

#unable to describe the 'execfile' method due to internal error

def is_path_builtin(path):
   '''Returns True if the path is one of the built-in paths used by Blender.
      
      Arguments:
      @path (str): Path you want to check if it is in the built-in settings directory

   '''

   return bool

def keyconfig_init():
   

   pass

#unable to describe the 'keyconfig_set' method due to internal error

#unable to describe the 'load_scripts' method due to internal error

def make_rna_paths(struct_name, prop_name, enum_name):
   '''Create RNA "paths" from given names.
      
      Arguments:
      @struct_name (string): Name of a RNA struct (like e.g. "Scene").
      @prop_name (string): Name of a RNA struct's property.
      @enum_name (string): Name of a RNA enum identifier.

      @returns (tuple of strings): A triple of three "RNA paths"(most_complete_path, "struct.prop", "struct.prop:'enum'").
      If no enum_name is given, the third element will always be void.
      
   '''

   return tuple of strings

def manual_map():
   

   pass

def modules_from_path(path, loaded_modules):
   '''Load all modules in a path and return them as a list.
      
      Arguments:
      @path (string): this path is scanned for scripts and packages.
      @loaded_modules (set): already loaded module names, files matching thesenames will be ignored.
      

      @returns (list): all loaded modules.
   '''

   return list

#unable to describe the 'preset_find' method due to internal error

def preset_paths(subdir):
   '''Returns a list of paths for a specific preset.
      
      Arguments:
      @subdir (string): preset subdirectory (must not be an absolute path).

      @returns (list): script paths.
   '''

   return list

def refresh_script_paths():
   '''Run this after creating new script paths to update sys.path
      
   '''

   pass

def register_class(cls):
   '''Register a subclass of a Blender type class.
      
      Arguments:
      @cls (class): Blender type class in:bpy.types.Panel, bpy.types.UIList,
      bpy.types.Menu, bpy.types.Header,
      bpy.types.Operator, bpy.types.KeyingSetInfo,
      bpy.types.RenderEngine
      :raises ValueError:
      if the class is not a subclass of a registerable blender class.
      .. note::
      If the class has a *register* class method it will be called
      before registration.
      

   '''

   pass

def register_classes_factory(classes):
   '''Utility function to create register and unregister functions
      which simply registers and unregisters a sequence of classes.
      
   '''

   pass

def register_manual_map(manual_hook):
   

   pass

def register_submodule_factory(module_name, submodule_names):
   '''Utility function to create register and unregister functions
      which simply load submodules,
      calling their register & unregister functions.
      .. note::
      Modules are registered in the order given,
      unregistered in reverse order.
      
      Arguments:
      @module_name (string): The module name, typically __name__.
      @submodule_names (list of strings): List of submodule names to load and unload.

      @returns (tuple pair of functions): register and unregister functions.
   '''

   return tuple pair of functions

#unable to describe the 'register_tool' method due to internal error

def resource_path(type, major=bpy.app.version[0], minor=bpy.app.version[1]):
   '''Return the base path for storing system files.
      
      Arguments:
      @type (string): string in ['USER', 'LOCAL', 'SYSTEM'].
      @major (int): major version, defaults to current.
      @minor (string): minor version, defaults to current.

      @returns (str): the resource path (not necessarily existing).
   '''

   return str

def script_path_pref():
   '''returns the user preference or None
      
   '''

   pass

def script_path_user():
   '''returns the env var and falls back to home dir or None
      
   '''

   pass

#unable to describe the 'script_paths' method due to internal error

#unable to describe the 'smpte_from_frame' method due to internal error

#unable to describe the 'smpte_from_seconds' method due to internal error

def system_resource(type, path=""):
   '''Return a system resource path.
      
      Arguments:
      @type (string): string in ['DATAFILES', 'SCRIPTS', 'PYTHON'].
      @path (string): Optional subdirectory.

   '''

   pass

#unable to describe the 'time_from_frame' method due to internal error

#unable to describe the 'time_to_frame' method due to internal error

def unescape_identifier(string):
   '''Simple string un-escape function used for animation paths.
      This performs the reverse of escape_identifier.
      
      Arguments:
      @string (string): text

      @returns (str): The un-escaped string.
   '''

   return str

def unregister_class(cls):
   '''Unload the Python class from blender.
      If the class has an *unregister* class method it will be called
      before unregistering.
      
   '''

   pass

def unregister_manual_map(manual_hook):
   

   pass

def unregister_tool(tool_cls):
   

   pass

#unable to describe the 'user_resource' method due to internal error

