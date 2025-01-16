{...}@inputs:
let
  endoregTasks = (
    import ./endoreg-db.nix { }
  );

  customTasks = {
    
  } // endoregTasks;

in customTasks 