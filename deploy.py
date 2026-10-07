#!/usr/bin/env python3
"""
One-command build + deploy for EatOuts on Cloudflare Workers.

Steps:
  1. python scripts/build_restaurant_directory.py  (merge owner submissions)
  2. npm run build                                  (copy-static.mjs -> dist/)
  3. npx wrangler deploy                            (ship to Cloudflare)
"""
import subprocess, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def run(cmd, **kw):
    print(f'\n> {" ".join(cmd)}')
    r = subprocess.run(cmd, cwd=ROOT, **kw)
    if r.returncode != 0:
        print(f'\nFAILED: {" ".join(cmd)}', file=sys.stderr)
        sys.exit(r.returncode)


def main():
    run([sys.executable, 'scripts/build_restaurant_directory.py'])
    # On Windows, npm/npx are .cmd shims and need shell=True.
    shell = os.name == 'nt'
    run(['npm', 'run', 'build'], shell=shell)
    run(['npx', 'wrangler', 'deploy'], shell=shell)
    print('\nDeployed.')


if __name__ == '__main__':
    main()