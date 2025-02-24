{...}@inputs:
let
  endoregTasks = (
    import ./endoreg-db.nix { }
  );
  vueTasks = (
    import ./vue.nix { }
  );

  customTasks = {
    
  } // vueTasks;

in customTasks 