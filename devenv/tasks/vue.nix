{}@inputs:
let
  customTasks = {
    "vue:build".after = 
      ["uv:sync"];
    
    "vue:build".exec = 
      ''
      cd frontend
      npm run build
      cd ..
      '';
    "vue:build".execIfModified = [
      "frontend"
      "frontend/package.json"
      "frontend/package-lock.json"
    ];
  };

in customTasks