{...}@inputs:
let
  endoregTasks = (
    import ./endoreg-db.nix { }
  );
  vueTasks = (
    import ./vue.nix { }
  );
  envTasks = (
    import ./env.nix { }
  );

  customTasks = {
    
  } //envTasks;

in customTasks 