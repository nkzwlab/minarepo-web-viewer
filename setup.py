# -*- coding: utf-8 -*-
from setuptools import setup, find_packages

setup(
    name='minarepoviewer',
    version='0.0.1',
    description='minarepo viewer',
    author='Hide. Tokuda Lab.',
    author_email='contact@ht.sfc.keio.ac.jp',
    url='https://github.com/htlab/minarepo-web-viewer',
    packages=find_packages(),
    license=open('LICENSE').read(),
    include_package_data=True,
    install_requires=[
    ],
    tests_require=['nose', 'WebTest'],
    test_suite='nose.collector'
)
