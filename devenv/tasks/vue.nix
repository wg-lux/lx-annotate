{pkgs, lib, config, ...}@inputs:
let
  customTasks = {
    "vue:build".after = 
      ["uv:sync"];
    
    "vue:build".exec = 
      ''
      cd frontend
      npm run build
      cd ..
      python manage.py collectstatic --noinput
      '';
    "vue:build".execIfModified = [
      "frontend"
      "frontend/package.json"
      "frontend/package-lock.json"
    ];
  };

in customTasks