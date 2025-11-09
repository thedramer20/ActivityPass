import subprocess
import sys
import signal
from pathlib import Path

from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Run frontend (dev) and Django server together. Use --build to build frontend instead of dev."

    def add_arguments(self, parser):
        parser.add_argument('--build', action='store_true', help='Build React app and serve via Django')
        parser.add_argument('--addrport', default='127.0.0.1:8000', help='runserver addr:port')

    def handle(self, *args, **options):
        repo_root = Path(__file__).resolve().parents[4]
        frontend_dir = repo_root / 'frontend'
        build = options['build']
        addrport = options['addrport']

        if build:
            self.stdout.write(self.style.NOTICE('Building frontend...'))
            call_command('build_frontend')
            self.stdout.write(self.style.NOTICE('Starting Django runserver (serving built React)...'))
            call_command('runserver', addrport)
            return

        # Dev mode: run npm start and runserver concurrently
        try:
            subprocess.check_call(['npm', '--version'], cwd=str(frontend_dir))
        except Exception:
            self.stderr.write(self.style.ERROR('npm is required on PATH to run the frontend dev server.'))
            sys.exit(1)

        self.stdout.write(self.style.NOTICE('Starting frontend dev server (npm start)...'))
        fe_proc = subprocess.Popen(['npm', 'start'], cwd=str(frontend_dir))

        def terminate(_sig=None, _frame=None):
            try:
                fe_proc.terminate()
            except Exception:
                pass

        try:
            signal.signal(signal.SIGINT, terminate)
            signal.signal(signal.SIGTERM, terminate)
        except Exception:
            pass

        try:
            self.stdout.write(self.style.NOTICE('Starting Django runserver...'))
            call_command('runserver', addrport)
        finally:
            terminate()
