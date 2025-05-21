{}@inputs:
let
  customTasks = {
    "vue:build".after = 
      ["devenv:enterShell"];
      
    
    "vue:build".exec = 
      ''
      cd frontend
      npm run build
      cd ..
      '';
      "vue:build".status =
      ''git rev-parse --verify --quiet HEAD >/dev/null'';

  };

in customTasks