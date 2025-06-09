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

  customTasks = {
    
  } //envTasks //vueTasks; # REMOVED PYTEST TASK AS THEY CAUSE DELAY TO SOME EXTENT; VERIFY IMPLEMENTATION //pytestTasks ;

in customTasks 