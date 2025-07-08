{...}@inputs:
let

  vueTasks = (
    import ./vue.nix { }
  );
  envTasks = (
    import ./env.nix { }
  );
  pytestTasks = (
    import ./pytest.nix { }
  );
  subrepoTasks = (
    import ./subrepos.nix { }
  );
  purgeTasks = (
    import ./purge.nix { }
  );

  customTasks = {
    
  } //envTasks //subrepoTasks //purgeTasks //vueTasks;

in customTasks 