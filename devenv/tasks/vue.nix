{}@inputs:
let
  customTasks = {
    "vue:build".after = 
      ["devenv:files"];
    
    "vue:build".exec = 
      ''
      cd frontend
      npm run build
      cd ..
      uv sync --no-config --no-reload
      python manage.py collectstatic --noinput
      '';
    "vue:build".execIfModified = [
      "frontend"
      "frontend/package.json"
      "frontend/package-lock.json"
    ];
  };

in customTasks