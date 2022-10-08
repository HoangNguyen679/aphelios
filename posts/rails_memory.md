---
title: "Rails memory leak problems"
date: "2021-10-10"
---

<!-- Checking.... -->

Ruby memory leak problems are maybe familiar with Rubyist and you can find so many articles about them palso the solution with detailed explanation. As a Rails developer, I also stuck on that, and I want to share my experience. Let's start!

# Problem showed up

<!-- part 1 -->

One morning, I woke up and received a message from the analysis team. They received 502 code when calling APIs. I started to investigate, of course, from server log. I went to Cloudwatch Log and found something were abnormal.

<img src="/images/high-memory-graph.png" />

<!-- part 1.5 -->

When analysis team called APIs, the memory percentage raise high, it is normal. But after that, the memory percentage did not decrease. And after 2-3 days, the memory went to 99%. That were unacceptable. And if I restart the server, it becames normal for the first day, after that, it's memory went up crazyly.

At first, I thought maybe it were thread or process or gem memory leak problems. So I started to check.

# Memory investigate

## Derails

<!-- part 2 -->

I begined with [Derailed](https://github.com/zombocom/derailed_benchmarks) for general view of my Rails application. You can see memory and object created at required time with all gems the Rails app is using.
And that report didn't seem wrong because I didn't found any issue with gem memory here.

You also can find the gem with memory problem [here](https://github.com/ASoftCo/leaky-gems)

## Puma

<!-- part 3 -->

So maybe Puma - the HTTP server of the app caused problem.
I received so many requests and use workers to handle them. Maybe Puma was sick and workers didn't work right. Actually, I found the [Puma memory problem](https://github.com/puma/puma/issues/342).

People suggested that using [puma_worker_killer](https://github.com/zombocom/puma_worker_killer) but that was bad idea. My workers can be killed suddenly and the requests went to server can failed anytime without management. It was defenitely not the solution.

## Benchmark tools

<!-- part 4 -->

[puma_worker_killer](https://github.com/zombocom/puma_worker_killer) was not the solution. So if the problem at first, was not Puma ? I needed to confirm that. I have many requests so I would go to test the HTTP requests. You can use many tools to do that. Here I used wrk and siege.

### Wrk

<!-- part 5 -->

You can find [wrk here](https://github.com/wg/wrk).

Go for [okcomputer](https://github.com/sportngin/okcomputer) test.

```bash
wrk -t10 -c100 -d30s https://api.my-server.com/okcomputer
Running 30s test @ https://api.my-server.com/okcomputer
  10 threads and 100 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency    48.71ms   42.66ms 516.80ms   88.08%
    Req/Sec   240.26     43.60   404.00     71.32%
  71412 requests in 30.09s, 46.72MB read
Requests/sec:   2373.02
Transfer/sec:      1.55MB
```

I had this result.

```
Times: 1
CPU: 0.3% -> 7.5% -> 0.3%
Memori: 8.5% -> 9.7% (no decrease)

Times: 2
CPU: 0.3% -> 7.5% -> 0.3%
Memori: 9.7% -> 9.7% (no decrease)
```

As you can see from the above result, when many requests came, the memory went high and did not decrease. After handling the requests, CPU utilization went low.

But the APIs used by the analysis team is inside AWS cloud, so I needed to check the internal requests.
(I realized that if the public APIs requests went high, the server memory also went high, that's not good at all)

### Siege

[Siege](https://github.com/JoeDog/siege) provides more useful options. So let's try it!

I defined the request file `usls.txt` as below:

```
https://private.my-server.com/v1/private/exercise/users?limit=50&recommendationDate=2020-12-08&offset=1
https://private.my-server.com/v1/private/exercise/users?limit=50&recommendationDate=2020-12-08&offset=2
https://private.my-server.com/v1/private/exercise/users?limit=50&recommendationDate=2020-12-08&offset=3
https://private.my-server.com/v1/private/exercise/users?limit=50&recommendationDate=2020-12-08&offset=4
https://private.my-server.com/v1/private/exercise/users?limit=50&recommendationDate=2020-12-08&offset=5
https://private.my-server.com/v1/private/exercise/users?limit=50&recommendationDate=2020-12-08&offset=6
https://private.my-server.com/v1/private/exercise/users?limit=50&recommendationDate=2020-12-08&offset=7
https://private.my-server.com/v1/private/exercise/users?limit=50&recommendationDate=2020-12-08&offset=8
https://private.my-server.com/v1/private/exercise/users?limit=50&recommendationDate=2020-12-08&offset=9
```

And called them

```bash
siege -c10 -t30s -f urls.txt -H "Authorization: $authorization_key"
```

The result was as follows:

```bash
Lifting the server siege...
Transactions:                 195 hits
Availability:              100.00 %
Elapsed time:               29.84 secs
Data transferred:           14.06 MB
Response time:                1.48 secs
Transaction rate:            6.53 trans/sec
Throughput:                0.47 MB/sec
Concurrency:                9.66
Successful transactions:         195
Failed transactions:               0
Longest transaction:            3.87
Shortest transaction:            0.57
```

And the changes in memory, CPU

```
CPU: 0.03% -> 1.9% -> 0.05%
Memory: 30% -> 39% -> 39%
```

All my requests were handled but the memory did not decrease.
It seemed like the Puma was not the root of the memory problem.
I had to dig deeper, maybe the real culprit had been Ruby all along

# Jemalloc

After many hours side by side with google I found these blog:

- [Taming Rails memory bloat](https://mikeperham.com/2018/04/25/taming-rails-memory-bloat/)
- [Malloc Can Double Multi-threaded Ruby Program Memory Usage](https://www.speedshop.co/2017/12/04/malloc-doubles-ruby-memory.html)

If you had used C programming language, you must know the malloc function. That function is called when you want to allocate memory for the variables. And Ruby uses it for memory management. Here it is! Seem I figured it out.

I just installed the jemalloc in dockerfile and setup to Ruby use it.

```dockerfile
RUN apt-get install -y libjemalloc-dev libjemalloc2
ENV LD_PRELOAD=/usr/lib/x86_64-linux-gnu/libjemalloc.so.2
```

Finally the memory was not high anymore. It was totally OK when the analysis team called APIs at around 15:00.

<img src="/images/low-memory-graph.png" />

The server memory was often below 30% and I satisfied with that results.

#  Further discussion

You can find docker Ruby with jemalloc images [here](https://hub.docker.com/r/swipesense/ruby-jemalloc)
It's recommended to start with a right choice of memory management library as it will mitigate your pain of encountering memory problems.

For now, I don't see the reason why ruby is not compiled with jemalloc. Ruby need improve itself for memory also performance in order to compete with other raising up programming languages. Let's go.
