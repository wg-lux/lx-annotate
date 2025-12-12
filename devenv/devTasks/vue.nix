{pkgs, lib, config, ...}@inputs:
let
  customTasks = {
    "vue:build".after = 
      ["uv:sync"];
    
    "vue:build".exec = 
      ''
      cd frontend
      direnv allow
      npm install
      npm run build
      '';
      
    "vue:build".before = 
      ["devenv:enterShell"];
    "vue:build".execIfModified = [
      "frontend"
      "frontend/package.json"
      "frontend/package-lock.json"
    ];
  };

in customTasks