import * as mediasoup from '../';

let worker: mediasoup.types.Worker;
let router: mediasoup.types.Router;
let activeSpeakerObserver: mediasoup.types.ActiveSpeakerObserver;

const mediaCodecs: mediasoup.types.RtpCodecCapability[] =
[
	{
		kind       : 'audio',
		mimeType   : 'audio/opus',
		clockRate  : 48000,
		channels   : 2,
		parameters :
		{
			useinbandfec : 1,
			foo          : 'bar'
		}
	}
];

beforeAll(async () =>
{
	worker = await mediasoup.createWorker();
	router = await worker.createRouter({ mediaCodecs });
});

afterAll(() => worker.close());

test('router.createActiveSpeakerObserver() succeeds', async () =>
{
	const onObserverNewRtpObserver = jest.fn();

	router.observer.once('newrtpobserver', onObserverNewRtpObserver);

	activeSpeakerObserver = await router.createActiveSpeakerObserver();

	expect(onObserverNewRtpObserver).toHaveBeenCalledTimes(1);
	expect(onObserverNewRtpObserver).toHaveBeenCalledWith(activeSpeakerObserver);
	expect(typeof activeSpeakerObserver.id).toBe('string');
	expect(activeSpeakerObserver.closed).toBe(false);
	expect(activeSpeakerObserver.paused).toBe(false);
	expect(activeSpeakerObserver.appData).toEqual({});

	await expect(router.dump())
		.resolves
		.toMatchObject(
			{
				rtpObserverIds : [ activeSpeakerObserver.id ]
			});
}, 2000);

test('router.createActiveSpeakerObserver() with wrong arguments rejects with TypeError', async () =>
{
	// @ts-ignore
	await expect(router.createActiveSpeakerObserver({ interval: false }))
		.rejects
		.toThrow(TypeError);

	// @ts-ignore
	await expect(router.createActiveSpeakerObserver({ appData: 'NOT-AN-OBJECT' }))
		.rejects
		.toThrow(TypeError);
}, 2000);

test('activeSpeakerObserver.pause() and resume() succeed', async () =>
{
	await activeSpeakerObserver.pause();

	expect(activeSpeakerObserver.paused).toBe(true);

	await activeSpeakerObserver.resume();

	expect(activeSpeakerObserver.paused).toBe(false);
}, 2000);

test('activeSpeakerObserver.close() succeeds', async () =>
{
	// We need different a AudioLevelObserver instance here.
	const activeSpeakerObserver2 =
		await router.createAudioLevelObserver({ maxEntries: 8 });

	let dump = await router.dump();

	expect(dump.rtpObserverIds.length).toBe(2);

	activeSpeakerObserver2.close();

	expect(activeSpeakerObserver2.closed).toBe(true);

	dump = await router.dump();

	expect(dump.rtpObserverIds.length).toBe(1);

}, 2000);

test('ActiveSpeakerObserver emits "routerclose" if Router is closed', async () =>
{
	// We need different Router and AudioLevelObserver instances here.
	const router2 = await worker.createRouter({ mediaCodecs });
	const activeSpeakerObserver2 = await router2.createAudioLevelObserver();

	await new Promise<void>((resolve) =>
	{
		activeSpeakerObserver2.on('routerclose', resolve);
		router2.close();
	});

	expect(activeSpeakerObserver2.closed).toBe(true);
}, 2000);

test('ActiveSpeakerObserver emits "routerclose" if Worker is closed', async () =>
{
	await new Promise<void>((resolve) =>
	{
		activeSpeakerObserver.on('routerclose', resolve);
		worker.close();
	});

	expect(activeSpeakerObserver.closed).toBe(true);
}, 2000);
