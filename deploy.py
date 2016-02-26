import os
import subprocess
subprocess.call("gsutil -m rsync -d -r _site gs://admin.tally.us/", cwd=os.getcwd(), shell=True)
