# 12-Factor (ish) Configuration of Angular Applications

## What is a 12-Factor Application?
The "Twelve Factor Application" document (https://12factor.net) sets out a methodology for building applications that are meant to be deployed on software-as-a-service platforms and which are "portable and resilient".

The document was written in 2012, but it is arguably even more relavant today, due to the growing adoption of "cloud" based platforms and in-house hosting that often behaves like a cloud-based hosting platform. Also, who doesn't want to be portable and resilient? 

## Configuration
One of the basic portability items, Item III, is about configuration.
The basic idea is to not only externalize configuration, but to have the configuration live on the server to which the application is to be deployed.

Since the server is configured, and then the application is deployed to it, one does not need to rebuild the application before redeploying it or deploying it to a different server / environment.
From a devops point of view, this allows a single compiled application artifact to be moved among environments (say from QA to Production) with absolutely no changes, ensuring that what was tested is what gets deployed.

Unfortunately for 12-Factor fans writing Angular apps, the default (and recommended-by-Google&trade;) method for configuring an Angular application is to put the configuration into the environment.ts and environment.prod.ts files. The environment.ts file is used by default, and a "-prod" compilation swaps in the environment.prod.ts file instead. 

Additional environments can be created, but that does not get around the fact that recompilation is required to change deployment environments (or to change the configuration in the same environment), and that the complete configuration needs to be known at compile-time.

What we would rather do instead is to have the Angular application load it's configuration from the server on which it is deployed. Fortunately, Angular gives us a hook into the initialization process where we can do just that.

## Angular ConfigService Initialization
Angular provides an Injection Token named APP_INITIALIZER, by which you can provide, [according to the 
documentation](https://angular.io/api/core/APP_INITIALIZER) "A function that will be executed when an application is initialized". 

The documentation doesn't mention it, but if you provide a function that returns a Promise, then app initialization will wait until the Promise resolves (sorry, no, it won't work if you return an Observable). Detailed information about how that works can be found at https://hackernoon.com/hook-into-angular-initialization-process-add41a6b7e

So, now we know that we can hook into Angular's initialization process to load our configuration. But where will we load the configuration from? We have a bit of a chicken-and-egg problem - we want all of our service URLs to come from the configuration file - but how do we know what URL to use to load the configuation file?

Well, it turns out that we already have the chicken, so to speak. If our Angular application has started initializing, that means that the user loaded the application's index.html file somehow. We can take advantage of this by using relative addressing - by having a service request the configuration file from the same url hierarchy as the index.html file. 

We can use the HttpClient to make a request to, for example, "config/ui-config.json". If the Angular app is deployed as a "static" app to a web server, this would mean placing the "ui-config.json" file in a directory named "config" that is a direct sub-directory of the one holding the index.html file.

To make this work in other deployment scenarios, we simply need to make sure that the configuration file is made available at the expected URL. How this is done may vary greatly depending on the deployment scenario, and we'll see some examples later.

## Angular Implementation
We'll use an Angular Service to load and inject the configuration.
The loading part will be fairly simple - it will make an HTTP request for the configuration file, and return a Promise that will complete when the configuration is loaded. This loading method and it's Promise return value will be used with the APP_INITIALIZER injection token to make sure that the configuration is loaded during the application's initialization phase, before any other code attempts to use the configuration.

Here's a very simple implementation of the ConfigurationService (a production implementation would have error handling, etc.):

~~~ javascript
import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs/Observable';
import 'rxjs/add/operator/delay';
import 'rxjs/add/operator/catch';
import 'rxjs/add/observable/empty';
import 'rxjs/add/observable/of';

export function configurationServiceInitializerFactory(configurationService: ConfigService): Function {
  // a lambda is required here, otherwise `this` won't work inside ConfigurationService::load
  return () => configurationService.load();
}

@Injectable()
export class ConfigService {

  private loaded = false;
  private configuration: any;

  constructor(private http: HttpClient) {
  }

  public getConfig(): any {
    return this.configuration;
  }

  // the return value (Promise) of this method is used as an APP_INITIALIZER,
  // so the application's initialization will not complete until the Promise resolves.
  public load(): Promise<any> {
    if(this.loaded) {
      return Observable.of(this, this.configuration).toPromise();
    } else {
      const configurationObservable = this.http.get(`config/ui-config.json`); // path is relative to that for app's index.html
      configurationObservable
        .catch(error => {
          console.log(`error loading configuration: ${JSON.stringify(error)}`);
          return Observable.empty();
        })
        .subscribe(config => {
            this.configuration = config;
            console.log(`got configuration: ${JSON.stringify(this.configuration)}`);
            this.loaded = true;
          }
        );
      return configurationObservable.toPromise();
    }
  }

}

~~~

In the code above, the exported function is the function that will be provided with the APP_INITIALIZER injection token. When the Angular framework invokes this function, the Configuration will initiate loading of the configuration file, and will return a Promise that will resolve when the HTTP call completes.

After the promise completes, the configuration will have been loaded (assuming there were no errors), the initialization will proceed, and the ConfgurationService can be safely injected into any Service or Component that needs the configuration. Calling ``` getConfig() ``` on the ConfigurationService will return the loaded configuration.

Now, to use this, in the app.module.ts, we would have something like: 

~~~ javascript
import {APP_INITIALIZER, NgModule} from '@angular/core';

@NgModule({
  providers: [
    ConfigurationService,
    { provide: APP_INITIALIZER, useFactory: configurationServiceInitializerFactory, deps: [ConfigurationService], multi: true },
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
~~~

Notice that there are two providers, one for the APP\_INITIALIZER which is the function that the framework will invoke during initialization, and which will kick off the loading of the configuration, and another for the ConfigurationService, so that the service can be injected. Note also that the APP\_INITIALIZER provider has a ```deps``` property, which indicates a dependency relationship between APP\_INITIALIZER and the ConfigurationService.

## Serving the Configuration File
As far as the Angular application is concerned, the ConfigurationService is always going to make a request for ```config/ui-config.json```. It will be the job of whatever served the application's ```index.html``` file to also serve the configuration file at that url.

I'm assuming that your Angular application **will** be using one or more back-end services, and that the primary contents of your config file will be service URLs. You could, however, use the configuration for other purposes.

### Using the Angular Proxy
For stand-alone Angular development, you can make use of the [proxying support in the webpack dev server used by the Angular CLI](https://github.com/angular/angular-cli/blob/master/docs/documentation/stories/proxy.md) to serve the configuration file.

Create a ```config``` directory under your src/assets directory, and place your ui-config.json file in it.
Then, create a ``` proxy.conf.json``` file next to your project's ```package.json``` file, with the following contents:

~~~
{
  "/config/*": {
    "target": "http://localhost:4200",
    "secure": false,
    "logLevel": "debug",
    "pathRewrite": {
      "^/config": "/assets/config"
    }
  }
}

~~~

If you start your Angular app with ```ng serve --proxy-config proxy.conf.json```, this should cause the configuration file to be served at ```http://localhost:4200/config/ui-config.json```, and your application should load the configuration file at initialization time.

When your application is run without the proxy server, you will have to otherwise arrange for the configuration file to be served correctly.

If for, example, you deploy your application's ```dist``` directory to a web server, you can simply place the configuration directory in that directory, next to the index.html file. Or, you can place the configuration file elsewhere, and configure a proxy (e.g. mod\_proxy for Apache or ngx\_http\_rewrite\_module for NGINX) to serve the file from the desired URL.

If you are embedding the Angular application in your back-end application, you may be able to configure your back-end application to serve the configuration file from an external location.

For example, if you have a Java-based SpringBoot application, and you are serving the Angular front-end from the Java application's "static" directory, you can configure an additional endpoint to serve the configuration. Here is an example configuration Bean that sets this up based on a location in the application's ```application.properties``` file:

~~~ java
@Configuration
public class WebConfiguration  {
    private final static Logger logger = Logger.getLogger(WebConfiguration.class.getName());
 
    // property name (in application.properties) is ui-config.location
    // default value (if not provided) is "file:ui-config/"
	@Value("${ui-config.location:file:ui-config/}")
	private String uiConfigFileLocation;
	
	@Bean
	public WebMvcConfigurerAdapter serveApiConfig() {
	    return new WebMvcConfigurerAdapter() {
	        @Override
	        public void addResourceHandlers(ResourceHandlerRegistry registry) {
	            logger.info("Adding resource handler for ui config: " + uiConfigFileLocation);
	            registry.addResourceHandler("/config/**").addResourceLocations(uiConfigFileLocation);
	        }
	    };
	}
}
~~~

## Source Code
Full source code for the Angular application can be found at https://github.com/rfreedman/angular-configuration-service

## Chariot Angular Training
If you're looking for training in Angular, we can provide that! See what we have to offer at https://chariotsolutions.com/services/training/ 