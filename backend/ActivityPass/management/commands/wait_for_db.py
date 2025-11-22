from django.core.management.base import BaseCommand
from django.db import connections
from django.db.utils import OperationalError
import time
import os


class Command(BaseCommand):
    help = 'Wait for database to be available'

    def add_arguments(self, parser):
        parser.add_argument(
            '--timeout',
            type=int,
            default=60,
            help='Timeout in seconds to wait for database'
        )

    def handle(self, *args, **options):
        timeout = options['timeout']
        self.stdout.write('Waiting for database...')

        start_time = time.time()
        db_conn = connections['default']

        while time.time() - start_time < timeout:
            try:
                db_conn.cursor()
                self.stdout.write(
                    self.style.SUCCESS('Database is available!')
                )
                return
            except OperationalError:
                self.stdout.write('Database unavailable, waiting 1 second...')
                time.sleep(1)

        self.stderr.write(
            self.style.ERROR(f'Database unavailable after {timeout} seconds')
        )
        exit(1)