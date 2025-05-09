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
  pytestTasks = (
    import ./pytest.nix { }
  );

  customTasks = {
    
  } //envTasks //vueTasks //endoregTasks //pytestTasks ;

in customTasks 