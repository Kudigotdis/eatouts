#!/usr/bin/env python3
"""
One-command build + deploy for EatOuts on Cloudflare Pages.

Steps:
  1. npm run build  (python merge scripts -> directory_runtime_data.json,
                     then copy-static.mjs -> dist/)
  2. npx wrangler pages deploy dist  (ship to Cloudflare Pages)
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
    # On Windows, npm/npx are .cmd shims and need shell=True.
    shell = os.name == 'nt'
    run(['npm', 'run', 'build'], shell=shell)
    run(['npx', 'wrangler', 'pages', 'deploy', 'dist'], shell=shell)
    print('\nDeployed.')


if __name__ == '__main__':
    main()
