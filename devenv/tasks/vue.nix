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
  };

in customTasks