{}@inputs:
let
  customTasks = {
    "vue:build".after = 
      ["devenv:enterShell"];
      
    
    "vue:build".exec = 
      ''
      cd frontend
      npm install
      npm run build
      cd ..
      '';
      "vue:build".status =
      ''git rev-parse --verify --quiet HEAD >/dev/null'';

  };

in customTasks