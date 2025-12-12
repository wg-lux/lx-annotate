import subprocess
import re

def setup_django_env():
    """
    Sets up the Django environment by installing dependencies and applying migrations.
    """
    print("Installing dependencies...")
    subprocess.run(["uv", "sync"], check=True)

    print("Applying database migrations...")
    subprocess.run(["python", "manage.py", "migrate"], check=True)

    print("Collecting static files...")
    subprocess.run(["python", "manage.py", "collectstatic", "--noinput"], check=True)
    
    print("Copying env file...")
    subprocess.run(["cp", ".env.example", ".env"], check=True)
    
    print("Generating secret keys...")
    # Generate SECRET_KEY
    result_key = subprocess.run(
        ["python", "manage.py", "generate_secret_key"],
        capture_output=True,
        text=True,
        check=True
    )
    secret_key = result_key.stdout.strip().split('\n')[-1]
    
    # Generate SALT
    result_salt = subprocess.run(
        ["python", "manage.py", "generate_secret_key"],
        capture_output=True,
        text=True,
        check=True
    )
    django_salt = result_salt.stdout.strip().split('\n')[-1]
    
    print(f"Generated DJANGO_SECRET_KEY: {secret_key}")
    print(f"Generated DJANGO_SALT: {django_salt}")
    
    # Update .env file
    print("Updating .env file with generated secrets...")
    with open('.env', 'r', encoding='utf-8') as f:
        env_content = f.read()
    
    # Replace DJANGO_SECRET_KEY
    env_content = re.sub(
        r'DJANGO_SECRET_KEY=.*',
        f'DJANGO_SECRET_KEY="{secret_key}"',
        env_content
    )
    
    # Replace DJANGO_SALT
    env_content = re.sub(
        r'DJANGO_SALT=.*',
        f'DJANGO_SALT="{django_salt}"',
        env_content
    )
    
    with open('.env', 'w', encoding='utf-8') as f:
        f.write(env_content)
    
    print("✅ Secret keys written to .env file")

    print("Django environment setup complete.")