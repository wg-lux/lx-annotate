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
  };

in customTasks