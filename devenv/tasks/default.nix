{ pkgs, lib, config, ...}@inputs:
let

  vueTasks = (
    import ./vue.nix { inherit config pkgs lib; }
  );
  envTasks = (
    import ./env.nix { inherit config pkgs lib; }
  );
  pytestTasks = (
    import ./pytest.nix { inherit config pkgs lib; }
  );
  subrepoTasks = (
    import ./subrepos.nix { inherit config pkgs lib; }
  );
  purgeTasks = (
    import ./purge.nix { inherit config pkgs lib; }
  );
  uvTasks = (
    import ./uv.nix { inherit config pkgs lib; }
  );
  deployTasks = (
    import ./deploy.nix { inherit config pkgs lib; }
  );
  dbTasks = (
    import ./db.nix { inherit config pkgs lib; }
  );

  customTasks = {
    
  } //envTasks //deployTasks //purgeTasks //vueTasks //uvTasks //dbTasks;

in customTasks 