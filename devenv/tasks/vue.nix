{}@inputs:
let
  customTasks = {
    "vue:build".after = 
      ["devenv:enterShell"];
    

    "vue:collectstatic".after = 
      ["vue:build"]; 

    "vue:collectstatic".exec = 
      "uv run python manage.py collectstatic --noinput";

    "vue:build".exec = 
      "cd frontend"
      + " && npm run build"
      + " && cd ..";
  };

in customTasks