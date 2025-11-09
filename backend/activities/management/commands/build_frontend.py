import subprocess
import sys
from pathlib import Path

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Build the React frontend (npm install + npm run build)"

    def handle(self, *args, **options):
        repo_root = Path(__file__).resolve().parents[4]
        frontend_dir = repo_root / 'frontend'
        self.stdout.write(self.style.NOTICE(f"Frontend dir: {frontend_dir}"))

        try:
            subprocess.check_call(['npm', '--version'], cwd=str(frontend_dir))
        except Exception:
            self.stderr.write(self.style.ERROR('npm is required on PATH to build the frontend.'))
            sys.exit(1)

        try:
            subprocess.check_call(['npm', 'install'], cwd=str(frontend_dir))
            subprocess.check_call(['npm', 'run', 'build'], cwd=str(frontend_dir))
        except subprocess.CalledProcessError as e:
            self.stderr.write(self.style.ERROR(f'Frontend build failed: {e}'))
            sys.exit(e.returncode)

        self.stdout.write(self.style.SUCCESS('Frontend build completed successfully.'))
