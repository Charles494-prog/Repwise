import Capacitor
import CoreMotion

/**
 * iOS counterpart of StepSensorPlugin.java (same JS name and methods: status / request / read).
 * Reads the motion coprocessor via CMPedometer. "total" is steps since local midnight, so it only
 * goes down at the start of a new day — the JS treats a drop like a reboot and starts counting again.
 */
@objc(StepSensorPlugin)
public class StepSensorPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StepSensorPlugin"
    public let jsName = "StepSensor"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "request", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "read", returnType: CAPPluginReturnPromise)
    ]
    private let pedometer = CMPedometer()

    private func granted() -> Bool { CMPedometer.authorizationStatus() == .authorized }

    @objc func status(_ call: CAPPluginCall) {
        call.resolve(["available": CMPedometer.isStepCountingAvailable(), "granted": granted()])
    }

    @objc func request(_ call: CAPPluginCall) {
        guard CMPedometer.isStepCountingAvailable(), CMPedometer.authorizationStatus() == .notDetermined else { status(call); return }
        // The first query shows the Motion & Fitness permission prompt; resolve once the user answers.
        pedometer.queryPedometerData(from: Date().addingTimeInterval(-60), to: Date()) { [weak self] _, _ in
            DispatchQueue.main.async { self?.status(call) }
        }
    }

    @objc func read(_ call: CAPPluginCall) {
        guard CMPedometer.isStepCountingAvailable() else { call.reject("No step sensor"); return }
        let auth = CMPedometer.authorizationStatus()
        if auth == .denied || auth == .restricted { call.reject("Permission denied"); return }
        let now = Date()
        pedometer.queryPedometerData(from: Calendar.current.startOfDay(for: now), to: now) { data, error in
            if let error = error { call.reject(error.localizedDescription); return }
            call.resolve(["total": data?.numberOfSteps.intValue ?? 0, "ts": Int(now.timeIntervalSince1970 * 1000)])
        }
    }
}

/// Bridge view controller that registers the app's own plugins (the iOS side of MainActivity.registerPlugin).
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(StepSensorPlugin())
    }
}
