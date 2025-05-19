import subprocess; ping_result = subprocess.run(["ping", "-c", "1", "8.8.8.8"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=2); print("Ping 결과:", ping_result.returncode)
