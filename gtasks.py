from requests_oauth2 import OAuth2

import requests

import json


class GTasks:
    
    tasks_auth_uri = 'https://www.googleapis.com/auth/tasks'
    tasks_api_uri = 'https://www.googleapis.com/tasks/v1'
    methods = {
        'tasks.list': ('get', 'lists/{0}/tasks', False),
        'tasks.get': ('get', 'lists/{0}/tasks/{1}', False),
        'tasks.insert': ('post', 'lists/{0}/tasks', True),
        'tasks.update': ('put', 'lists/{0}/tasks/{1}', True),
        'tasks.delete': ('delete', 'lists/{0}/tasks/{1}', False),
        'tasks.clear': ('post', 'lists/{0}/clear', False),
        'tasks.move': ('post', 'lists/{0}/tasks/{1}/move', False),
        'tasks.patch': ('patch', 'lists/{0}/tasks/{1}', True),
        'tasklists.list': ('get', 'users/@me/lists', False),
        'tasklists.get': ('get', 'users/@me/lists/{0}', False),
        'tasklists.insert': ('post', 'users/@me/lists', True),
        'tasklists.update': ('put', 'users/@me/lists/{0}', True),
        'tasklists.delete': ('delete', 'users/@me/lists/{0}', False),
        'tasklists.patch': ('patch', 'users/@me/lists/{0}', True),
        }
        
    def __init__(self, client_id, client_secret, callback_uri):
        site = 'https://accounts.google.com'
        auth_uri = '/o/oauth2/auth'
        token_uri = '/o/oauth2/token'
        self.handler = OAuth2(client_id, client_secret, site, callback_uri, auth_uri, token_uri)
        
    
    def get_authorize_uri(self):
        return self.handler.authorize_url(self.tasks_auth_uri, response_type='code')
        

    def get_access_token(self, code):
        response = self.handler.get_token(code, grant_type='authorization_code')
        return response
    
    
    def set_access_token(self, token):
        self.token = token
    
    
    def do_request(self, method, tasklist='', task='', params={}, body=''):
        if not getattr(self, 'token'):
            raise Exception('Not authenticated!')
        
        httpmethod, uri, body_req = self.methods.get(method)
        uri = '{0}/{1}'.format(self.tasks_api_uri, uri.format(tasklist, task))
        params['access_token'] = self.token
        headers = {}
        if body_req:
            headers['content-type'] = 'application/json'
            body = json.dumps(body)
        if httpmethod == 'post':
            headers['content-length'] = str(len(body))
        
        response = getattr(requests, httpmethod)(uri, params=params, data=body, headers=headers)
        rdata = response.json
        print rdata
        if rdata is not None:
            print '>>>', httpmethod, response.url, params, body
            print response
            print '<<<'
            
            if 'error' in rdata:
                raise Exception('error {0}: {1}'.format(rdata['error']['code'], rdata['error']['message']))

        return rdata
        
        
