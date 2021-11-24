# Randarar randarars SVGs with placeholders to PNG
Create social media sharable images with dynamic content by using a single url

![Explanation](/example/svg/explanation.png)

## Why
If you share websites, a lot of tools like slack, linkedin and twitter show a preview image of the webpage. Randarar allows you to add dynamic content to your images with a very simple solution.

## How
You tell Randarar which image you want to render and the placeholders (your dynamic content) and you get back a ready made image.

The url looks like this:

https://p.salmo.link/render.png?s=https://raw.githubusercontent.com/p0wl/randarar/main/example/svg/onruby_share.svg&title=Remote%20Ruby%20Usergroup%20Hamburg&month=December%202020&participants=6

![Image with 14 participants](https://p.salmo.link/render.png?s=https://raw.githubusercontent.com/p0wl/randarar/main/example/svg/onruby_share.svg&title=Remote%20Ruby%20Usergroup%20Hamburg&month=December%202020&participants=6)

You can change the parameters (e.g. increase the number of participants) and get an updated image:

https://p.salmo.link/render.png?s=https://raw.githubusercontent.com/p0wl/randarar/main/example/svg/onruby_share.svg&title=Remote%20Ruby%20Usergroup%20Hamburg&month=December%202020&participants=7

![Image with 14 participants](https://p.salmo.link/render.png?s=https://raw.githubusercontent.com/p0wl/randarar/main/example/svg/onruby_share.svg&title=Remote%20Ruby%20Usergroup%20Hamburg&month=December%202020&participants=7)


### Full Example
Url: 
https://p.salmo.link/render.png?s=https://raw.githubusercontent.com/p0wl/randarar/main/example/svg/onruby_share.svg&title=Remote%20Ruby%20Usergroup%20Hamburg&month=December%202020&participants=6%20Participants&host=Host:%20Irina%20Lindt,%2009.12.2020%20um%2019:00&location=Online%20via%20Zoom&logo=https://hamburg.onruby.de/assets/labels/hamburg-b38fc9aa8aea505fcfe49a9032684ec70dbaab11071a4e9aeea2bf55695cdd3f.png

Generated Image: 
![Result](https://p.salmo.link/render.png?s=https://raw.githubusercontent.com/p0wl/randarar/main/example/svg/onruby_share.svg&title=Remote%20Ruby%20Usergroup%20Hamburg&month=December%202020&participants=6%20Participants&host=Host:%20Irina%20Lindt,%2009.12.2020%20um%2019:00&location=Online%20via%20Zoom&logo=https://hamburg.onruby.de/assets/labels/hamburg-b38fc9aa8aea505fcfe49a9032684ec70dbaab11071a4e9aeea2bf55695cdd3f.png)


## What you need

You have to prepare an svg image with placeholders. Placeholders are replaced using [mustache.js](https://github.com/janl/mustache.js/), so you change the dynamic parts of your svg from

```svg
<text fill="black" xml:space="preserve" style="white-space: pre" font-family="DM Sans" font-size="20" font-weight="bold" letter-spacing="-0.02em">
  <tspan x="1146.97" y="580.884">99</tspan>
</text>
```

to 

```svg
<text fill="black" xml:space="preserve" style="white-space: pre" font-family="DM Sans" font-size="20" font-weight="bold" letter-spacing="-0.02em">
  <tspan x="1146.97" y="580.884">{{participants}}</tspan>
</text>
```

After that, Randarar can render a dynamic value for the `{{ participants }}` field

## Integration

The Randarar urls are supposed to be integrated via an `og:image` meta tag.
The svg image has to be reachable using https.

You can construct the url to render like this:

```
https://p.salmo.link/render.png?s=<https://your-svg-url>&<your-placeholder>=<your-value>

# Example:
https://p.salmo.link/render.png?s=https://svgshare.com/i/W0C.svg&title=Hello%20There!
```

Randarar will return a `"Cache-Control": "public, max-age=86400",` header, which tells browsers to cache the image. As of now there is no server-side caching enabled.

## Replacement Values
Randarar can replace text and also images! For a dynamic image, you replace the inlined image in an svg with a placeholder:


```
# Original svg:
<image id="image0" width="104" height="104" xlink:href="data:image/png;base64,iVBORw0KG..."/>

# Adjusted, ready for Randarar:
<image id="image0" width="104" height="104" xlink:href="{{ logo }}"/>

```

and then supply the logo image url:

```
https://p.salmo.link/render.png?s=https://svgshare.com/i/W0C.svg&logo=https://hamburg.onruby.de/assets/labels/hamburg-b38fc9aa8aea505fcfe49a9032684ec70dbaab11071a4e9aeea2bf55695cdd3f.png
```

Works with pngs.


### Development
Randarar uses [sharp](https://github.com/lovell/sharp) to render svg as png images really fast.

Randarar is developed and deployed using [aws-cdk](https://github.com/aws/aws-cdk).
